import {
  activateReservations,
  inventoryTransaction,
  lockInventory,
  reservedQuantities,
  releaseCancelledReservations,
  ReservationError,
} from "./reservation";
import prisma from "../lib/prisma";
import { stripe } from "../lib/stripe";
import { CreatePaymentCheckoutDto, CreateRefundDto } from "../types/payment";
import {
  OrderStatus as OrderStatusEnum,
  PaymentStatus as PaymentStatusEnum,
  PaymentProvider as PaymentProviderEnum,
  PaymentMethod as PaymentMethodEnum,
} from "../../generated/prisma/enums";
import type Stripe from "stripe";

// Error classes

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export class WebhookSignatureError extends PaymentError {
  constructor() {
    super("Invalid webhook signature");
    this.name = "WebhookSignatureError";
  }
}

class PaymentAttemptNotFoundError extends Error {
  constructor() {
    super("Payment attempt not found");
  }
}

// Constants
const CURRENCY = "usd";

// Helpers

// Convert a dollar amount to Stripe's smallest currency unit
// Stripe expects integer cents, passing a float will throw
function toStripeAmount(dollars: number): number {
  return Math.round(dollars * 100);
}

// Create payment checkout

/** Activate a valid reservation and create or resume its Stripe PaymentIntent. */
export async function createPaymentCheckout(dto: CreatePaymentCheckoutDto) {
  const { orderId, method } = dto;
  if (!orderId) throw new PaymentError("orderId is required");
  if (method && method !== "CARD")
    throw new PaymentError("Only card payments are currently supported");
  let order;
  try {
    order = await activateReservations(orderId);
  } catch (error) {
    if (error instanceof ReservationError)
      throw new PaymentError(error.message);
    throw error;
  }
  // Every retry uses the same parameters/key. An ambiguous network failure
  // leaves the hold protected until Stripe can be reconciled.
  let intent;
  try {
    intent = await stripe.paymentIntents.create(
      {
        amount: toStripeAmount(order.totalPrice),
        currency: CURRENCY,
        metadata: { orderId },
        payment_method_types: ["card"],
      },
      { idempotencyKey: "crowdly-order:" + orderId },
    );
  } catch {
    throw new PaymentError(
      "Unable to start payment; retry this order to resume",
    );
  }
  const attempt = await prisma.paymentAttempt.upsert({
    where: { providerReference: intent.id },
    update: {},
    create: {
      orderId,
      provider: PaymentProviderEnum.STRIPE,
      providerReference: intent.id,
      paymentIntentId: intent.id,
      method: PaymentMethodEnum.CARD,
      amount: order.totalPrice,
      currency: CURRENCY,
      status: PaymentStatusEnum.PENDING,
    },
  });
  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret!,
    paymentAttemptId: attempt.id,
    amount: order.totalPrice,
  };
}

// Webhook processing

/**
 * Process a Stripe webhook event and update order/payment state.
 *
 * State changes and inventory consumption share one transaction. Conditional
 * updates make duplicate deliveries safe; transaction conflicts are returned
 * to Stripe as errors so that delivery can be retried.
 * A previously failed attempt can still succeed when its PaymentIntent is retried.
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  let newPaymentStatus: PaymentStatusEnum;
  switch (event.type) {
    case "payment_intent.succeeded":
      newPaymentStatus = PaymentStatusEnum.SUCCEEDED;
      break;

    case "payment_intent.payment_failed":
      newPaymentStatus = PaymentStatusEnum.FAILED;
      break;

    case "payment_intent.canceled":
      newPaymentStatus = PaymentStatusEnum.CANCELLED;
      break;

    default:
      return;
  }

  const pi = event.data.object;
  if (pi.object !== "payment_intent") return;

  const orderId = pi.metadata?.orderId;
  if (!orderId) return;

  // Read and claim the attempt inside the same transaction as fulfillment.
  await prisma.$transaction(async (tx) => {
    const paymentAttempt = await tx.paymentAttempt.findFirst({
      where: {
        orderId,
        paymentIntentId: pi.id,
        provider: PaymentProviderEnum.STRIPE,
      },
      include: { order: true },
    });

    if (!paymentAttempt) {
      // A delivery can arrive before the local attempt has been persisted.
      // Return an error so Stripe retries instead of acknowledging lost work.
      throw new PaymentError(
        "Payment attempt is not available for this webhook",
      );
    }

    if (
      paymentAttempt.status === PaymentStatusEnum.SUCCEEDED ||
      paymentAttempt.status === PaymentStatusEnum.REFUNDED ||
      paymentAttempt.status === newPaymentStatus ||
      (paymentAttempt.status === PaymentStatusEnum.CANCELLED &&
        newPaymentStatus === PaymentStatusEnum.FAILED)
    ) {
      return;
    }

    if (newPaymentStatus === PaymentStatusEnum.SUCCEEDED) {
      const expectedAmount = toStripeAmount(paymentAttempt.amount);
      if (
        pi.status !== "succeeded" ||
        pi.amount !== expectedAmount ||
        pi.amount_received !== expectedAmount ||
        pi.currency !== paymentAttempt.currency.toLowerCase() ||
        expectedAmount !== toStripeAmount(paymentAttempt.order.totalPrice)
      ) {
        throw new PaymentError(
          "Payment does not match the order amount or currency",
        );
      }
    }

    const attemptUpdate = await tx.paymentAttempt.updateMany({
      where: { id: paymentAttempt.id, status: paymentAttempt.status },
      data: { status: newPaymentStatus },
    });
    if (attemptUpdate.count !== 1) return;

    if (newPaymentStatus === PaymentStatusEnum.SUCCEEDED) {
      const orderUpdate = await tx.order.updateMany({
        where: {
          id: orderId,
          paymentStatus: {
            notIn: [PaymentStatusEnum.SUCCEEDED, PaymentStatusEnum.REFUNDED],
          },
        },
        data: {
          paymentStatus: PaymentStatusEnum.SUCCEEDED,
          status: OrderStatusEnum.CONFIRMATION,
        },
      });

      // Record additional successful payments, but fulfill the order only once.
      if (orderUpdate.count !== 1) return;

      await lockInventory(
        tx,
        paymentAttempt.order.tickets.map((ticket) => ticket.eventId),
      );
      const holds = await tx.ticketReservation.findMany({ where: { orderId } });
      if (paymentAttempt.order.expiresAt) {
        if (holds.length !== paymentAttempt.order.tickets.length)
          throw new PaymentError("Missing ticket reservations");
        for (const ticket of paymentAttempt.order.tickets) {
          const hold = holds.find(
            (hold) =>
              hold.eventId === ticket.eventId &&
              hold.ticketType === ticket.type,
          );
          if (
            !hold ||
            hold.quantity !== ticket.quantity ||
            hold.status !== "PAYMENT_ACTIVE"
          )
            throw new PaymentError(
              "Ticket reservation is not allocated to this payment",
            );
        }
      }
      await tx.ticketReservation.updateMany({
        where: { orderId, status: "PAYMENT_ACTIVE" },
        data: { status: "CONSUMED" },
      });
      const otherReservations = await reservedQuantities(
        tx,
        paymentAttempt.order.tickets.map((ticket) => ticket.eventId),
        new Date(),
      );

      for (const ticket of paymentAttempt.order.tickets) {
        if (
          !ticket.eventId ||
          !Number.isInteger(ticket.quantity) ||
          ticket.quantity <= 0
        ) {
          throw new PaymentError(
            "Order contains an invalid ticket quantity or event",
          );
        }

        const inventoryUpdate = await tx.event.updateMany({
          where: {
            id: ticket.eventId,
            tickets: {
              some: {
                type: ticket.type,
                quantity: {
                  gte:
                    ticket.quantity +
                    (otherReservations.get(
                      ticket.eventId + ":" + ticket.type,
                    ) ?? 0),
                },
              },
            },
          },
          data: {
            tickets: {
              updateMany: {
                where: { type: ticket.type },
                data: {
                  quantity: {
                    decrement: ticket.quantity,
                  },
                },
              },
            },
          },
        });
        if (inventoryUpdate.count !== 1) {
          throw new PaymentError(
            "Ticket inventory is unavailable for this order",
          );
        }
      }
    } else {
      if (newPaymentStatus === PaymentStatusEnum.CANCELLED)
        await releaseCancelledReservations(tx, orderId);
      // An older failed/cancelled attempt must not undo a paid order.
      await tx.order.updateMany({
        where: {
          id: orderId,
          paymentStatus: {
            notIn: [PaymentStatusEnum.SUCCEEDED, PaymentStatusEnum.REFUNDED],
          },
        },
        data: {
          paymentStatus: newPaymentStatus,
        },
      });
    }
  });
}

// Webhook signature verification

/**
 * Verify a Stripe webhook signature and return the decoded event.
 *
 * The raw request body MUST be passed as-is (not parsed JSON) so that
 * Stripe can verify the signature.  Invalid signatures throw an error.
 *
 * @param rawBody : raw request body string or Buffer from Stripe
 * @param signature : Stripe-Signature header value
 * @returns the decoded Stripe event
 */
export async function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new PaymentError("STRIPE_WEBHOOK_SECRET is not configured");
  }

  try {
    return await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch {
    throw new WebhookSignatureError();
  }
}

// Refund

/**
 * Process a refund for a payment attempt.
 *
 * 1. Verifies the PaymentAttempt exists and is in SUCCEEDED status.
 * 2. Calls Stripe's refund API.
 * 3. Updates PaymentAttempt and Order to REFUNDED.
 */
export async function processRefund(dto: CreateRefundDto): Promise<{
  refundId: string;
  amount: number;
}> {
  const { paymentAttemptId, amount } = dto;

  if (!paymentAttemptId) {
    throw new PaymentError("paymentAttemptId is required");
  }

  const paymentAttempt = await prisma.paymentAttempt.findUnique({
    where: { id: paymentAttemptId },
    include: { order: true },
  });

  if (!paymentAttempt) {
    throw new PaymentAttemptNotFoundError();
  }

  if (paymentAttempt.status !== PaymentStatusEnum.SUCCEEDED) {
    throw new PaymentError("Can only refund payments that have succeeded");
  }

  if (!paymentAttempt.paymentIntentId) {
    throw new PaymentError("No PaymentIntent ID stored for this attempt");
  }

  // Call Stripe refund API
  let refund: Stripe.Refund;
  try {
    if (amount) {
      // Partial refund,  convert to cents
      refund = await stripe.refunds.create({
        payment_intent: paymentAttempt.paymentIntentId,
        amount: toStripeAmount(amount),
      });
    } else {
      // Full refund
      refund = await stripe.refunds.create({
        payment_intent: paymentAttempt.paymentIntentId,
      });
    }
  } catch {
    throw new PaymentError("Failed to process refund via Stripe");
  }

  // Update PaymentAttempt and Order atomically
  await prisma.$transaction(async (tx) => {
    await tx.paymentAttempt.update({
      where: { id: paymentAttemptId },
      data: { status: "REFUNDED" },
    });

    await tx.order.update({
      where: { id: paymentAttempt.orderId },
      data: { paymentStatus: "REFUNDED" },
    });
  });

  return {
    refundId: refund.id,
    amount: refund.amount / 100, // Convert back from cents
  };
}

// Expire unpaid holds only. A clock cannot determine a Stripe payment's outcome.
// PAYMENT_ACTIVE holds remain unavailable until Stripe confirms cancellation.
export async function reconcileExpiredPayments(): Promise<number> {
  return inventoryTransaction(async (tx) => {
    const now = new Date();
    const expired = await tx.ticketReservation.findMany({
      where: { status: "HELD", expiresAt: { lte: now } },
    });
    await lockInventory(
      tx,
      expired.map((hold) => hold.eventId),
    );
    await tx.ticketReservation.updateMany({
      where: {
        id: { in: expired.map((hold) => hold.id) },
        status: "HELD",
        expiresAt: { lte: now },
      },
      data: { status: "RELEASED" },
    });
    return new Set(expired.map((hold) => hold.orderId)).size;
  });
}

// Cancel payment (buyer-initiated cancellation)

/**
 * Cancel an ongoing payment by the buyer.
 *
 * 1. Cancels the Stripe PaymentIntent.
 * 2. Updates PaymentAttempt to CANCELLED.
 * 3. Updates Order paymentStatus to CANCELLED.
 * 4. Releases inventory only after Stripe confirms cancellation.
 */
export async function cancelPayment(orderId: string): Promise<void> {
  if (!orderId) {
    throw new PaymentError("orderId is required");
  }

  const paymentAttempt = await prisma.paymentAttempt.findFirst({
    where: {
      orderId,
      status: { in: [PaymentStatusEnum.PENDING, PaymentStatusEnum.FAILED] },
    },
  });

  if (!paymentAttempt) {
    throw new PaymentError("No active payment to cancel");
  }

  // Missing Stripe references are unresolved payments, not safe releases.
  if (!paymentAttempt.paymentIntentId)
    throw new PaymentError("Payment must be reconciled before cancellation");
  try {
    const cancelled = await stripe.paymentIntents.cancel(
      paymentAttempt.paymentIntentId,
    );
    if (cancelled.status !== "canceled")
      throw new Error("Cancellation not confirmed");
  } catch {
    throw new PaymentError(
      "Could not confirm cancellation; the reservation remains protected",
    );
  }

  await inventoryTransaction(async (tx) => {
    await tx.paymentAttempt.updateMany({
      where: { id: paymentAttempt.id, status: { in: ["PENDING", "FAILED"] } },
      data: { status: "CANCELLED" },
    });
    await releaseCancelledReservations(tx, orderId);
    await tx.order.updateMany({
      where: {
        id: orderId,
        paymentStatus: { notIn: ["SUCCEEDED", "REFUNDED"] },
      },
      data: { paymentStatus: "CANCELLED" },
    });
  });
}
