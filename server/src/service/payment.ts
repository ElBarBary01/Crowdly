import prisma from "../lib/prisma";
import { stripe } from "../lib/stripe";
import {
  CreatePaymentCheckoutDto,
  CreateRefundDto,
  PaymentStatus,
} from "../types/payment";
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

class OrderNotFoundError extends PaymentError {
  constructor() {
    super("Order not found");
  }
}

class OrderAlreadyPaidError extends PaymentError {
  constructor() {
    super("Order is already paid");
  }
}

class OrderPaymentInProgressError extends PaymentError {
  constructor() {
    super("Payment for this order is already in progress");
  }
}

class CannotPayError extends PaymentError {
  constructor(reason: string) {
    super(`Cannot pay this order: ${reason}`);
  }
}

class PaymentAttemptNotFoundError extends Error {
  constructor() {
    super("Payment attempt not found");
  }
}

// Constants
//Payment window: 15 minutes is the standard checkout expiry
// After this window a pending payment is considered expired and released
const PAYMENT_EXPIRY_MS = 15 * 60 * 1000;
const CURRENCY = "usd";

// Helpers

// Convert a dollar amount to Stripe's smallest currency unit
// Stripe expects integer cents, passing a float will throw
function toStripeAmount(dollars: number): number {
  return Math.round(dollars * 100);
}

// Create payment checkout

/**
 * Start the payment flow for an order.
 *
 * 1. Validates the order exists and can be paid.
 * 2. Creates a PaymentAttempt with status PENDING.
 * 3. Creates a Stripe PaymentIntent with the order amount (from DB).
 * 4. Returns the PaymentIntent client_secret for the frontend to confirm.
 * 5. Advances order status to PAYMENT and paymentStatus to PENDING.
 */
export async function createPaymentCheckout(
  dto: CreatePaymentCheckoutDto,
): Promise<{
  paymentIntentId: string;
  clientSecret: string;
  paymentAttemptId: string;
  amount: number;
}> {
  const { orderId, method } = dto;

  if (!orderId) {
    throw new PaymentError("orderId is required");
  }

  // Fetch order, embedded tickets and events are returned by default
  // Only payments (the relation) needs to be included
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });

  if (!order) {
    throw new OrderNotFoundError();
  }

  // Only orders in TICKET_SELECTION can enter payment
  if (order.status !== OrderStatusEnum.TICKET_SELECTION) {
    throw new CannotPayError("Order is not in a payable state");
  }

  // Check if the order already has a succeeded payment
  if (order.paymentStatus === PaymentStatusEnum.SUCCEEDED) {
    throw new OrderAlreadyPaidError();
  }

  // Check for existing PENDING attempt, idempotency: return existing
  const existingAttempt = await prisma.paymentAttempt.findFirst({
    where: {
      orderId,
      status: PaymentStatusEnum.PENDING,
    },
  });

  if (existingAttempt) {
    // An active pending payment exists, return it so the frontend
    // can resume using the same PaymentIntent
    return {
      paymentIntentId: existingAttempt.paymentIntentId || "",
      clientSecret: "",
      paymentAttemptId: existingAttempt.id,
      amount: order.totalPrice,
    };
  }

  // Validate order has tickets and a positive total
  if (!order.tickets || order.tickets.length === 0) {
    throw new PaymentError("Order has no tickets");
  }
  if (order.totalPrice <= 0) {
    throw new PaymentError("Order total must be positive");
  }

  // Convert to Stripe amount (cents)
  const stripeAmount = toStripeAmount(order.totalPrice);

  // Map frontend method to Stripe payment method types
  const paymentMethodTypes: string[] = ["card"];
  if (method) {
    if (method === "APPLE_PAY" || method === "GOOGLE_PAY") {
      paymentMethodTypes.push("link"); // Stripe handles wallets via Link
    }
    if (method === "PAYPAL") {
      paymentMethodTypes.push("paypal");
    }
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency: CURRENCY,
      metadata: {
        orderId,
      },
      setup_future_usage: "off_session",
      payment_method_types: paymentMethodTypes,
    });
  } catch {
    throw new PaymentError("Failed to create payment intent");
  }

  const providerMethod = method
    ? (method.toUpperCase() as PaymentMethodEnum)
    : undefined;

  // Create PaymentAttempt record after Stripe succeeds
  const paymentAttempt = await prisma.paymentAttempt.create({
    data: {
      order: { connect: { id: orderId } },
      provider: PaymentProviderEnum.STRIPE,
      providerReference: paymentIntent.id,
      providerSessionId: null,
      paymentIntentId: paymentIntent.id,
      method: providerMethod,
      amount: order.totalPrice,
      currency: CURRENCY,
      status: PaymentStatusEnum.PENDING,
    },
  });

  // Advance order state
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatusEnum.PAYMENT,
      paymentStatus: PaymentStatusEnum.PENDING,
    },
  });

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret!,
    paymentAttemptId: paymentAttempt.id,
    amount: order.totalPrice,
  };
}

// Webhook processing

/**
 * Process a Stripe webhook event and update order/payment state.
 *
 * Idempotent: processing the same event twice is safe because we only
 * transition from PENDING.  If the attempt is already SUCCEEDED/FAILED,
 * we silently skip.
 *
 * Events handled:
 *   - payment_intent.succeeded  → mark succeeded, confirm order, decrement inventory
 *   - payment_intent.payment_failed → mark failed
 *   - payment_intent.canceled   → mark cancelled
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  // Extract the PaymentIntent from the event
  const pi =
    "payment_intent" in (event.data.object as Stripe.PaymentIntent)
      ? (event.data.object as Stripe.PaymentIntent)
      : null;

  if (!pi) {
    // Not a payment_intent event, skip
    return;
  }

  const paymentIntentId = pi.id;
  const orderId = (pi.metadata?.orderId as string) ?? null;

  if (!orderId) {
    // PaymentIntent not associated with an order, skip
    return;
  }

  // Find the pending PaymentAttempt for this order + PaymentIntent
  const paymentAttempt = await prisma.paymentAttempt.findFirst({
    where: {
      orderId,
      paymentIntentId,
      status: PaymentStatusEnum.PENDING,
    },
    include: { order: true },
  });

  if (!paymentAttempt) {
    // No matching pending attempt, either already processed, or
    // this is a duplicate webhook,  Safe to skip (idempotent)
    return;
  }

  // Determine the new state based on event type
  let newPaymentStatus: PaymentStatusEnum | null = null;

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
      // Unknown event type, skip
      return;
  }

  if (!newPaymentStatus) return;

  // Use a transaction to atomically update PaymentAttempt and Order.
  // On success, also decrement ticket inventory.
  await prisma.$transaction(async (tx) => {
    // Update PaymentAttempt
    await tx.paymentAttempt.update({
      where: { id: paymentAttempt.id },
      data: { status: newPaymentStatus },
    });

    if (newPaymentStatus === PaymentStatusEnum.SUCCEEDED) {
      // Confirm the order
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatusEnum.SUCCEEDED,
          status: OrderStatusEnum.CONFIRMATION,
        },
      });

      // Decrement ticket inventory for each ticket in the order.
      // Each OrderTicket now carries its own eventId so tickets from
      // different events are correctly decremented against the right event
      for (const ticket of paymentAttempt.order.tickets) {
        const eventId = ticket.eventId;
        if (!eventId) continue;

        // find the specific ticket type and decrement its quantity.
        await prisma.event.updateMany({
          where: { id: eventId },
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
      }
    } else {
      // FAILED or CANCELLED, keep order status in PAYMENT so the
      // buyer can retry.  Update only paymentStatus.
      // Inventory was not decremented (it is only consumed on SUCCEEDED),
      // so no release is needed.
      await tx.order.update({
        where: { id: orderId },
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
    // Stripe v22 uses async constructEvent
    return await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (error) {
    throw new PaymentError("Invalid webhook signature");
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

// Expired payments reconciliation

/**
 * Mark all PaymentAttempts that have been PENDING for longer than
 * PAYMENT_EXPIRY_MS as FAILED.  This handles the case where Stripe
 * never sends a webhook (e.g. network issues, user closes tab).
 *
 * Can be called from a cron job or manually.
 */
export async function reconcileExpiredPayments(): Promise<number> {
  const cutoff = new Date(Date.now() - PAYMENT_EXPIRY_MS);

  const expiredAttempts = await prisma.paymentAttempt.findMany({
    where: {
      status: PaymentStatusEnum.PENDING,
      createdAt: { lt: cutoff },
    },
  });

  if (expiredAttempts.length === 0) {
    return 0;
  }

  const expiredIds = expiredAttempts.map((a) => a.id);
  const orderIds = expiredAttempts.map((a) => a.orderId);

  await prisma.$transaction(async (tx) => {
    // Mark expired attempts as failed
    await tx.paymentAttempt.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: PaymentStatusEnum.FAILED },
    });

    // Update associated orders
    // Only if the order paymentStatus is still PENDING
    // (prevents overwriting a webhook that just arrived)
    await tx.order.updateMany({
      where: {
        id: { in: orderIds },
        paymentStatus: PaymentStatusEnum.PENDING,
      },
      data: {
        paymentStatus: PaymentStatusEnum.FAILED,
        // Revert order status to PAYMENT so the buyer can retry
        status: OrderStatusEnum.PAYMENT,
      },
    });
  });

  return expiredAttempts.length;
}

// Cancel payment (buyer-initiated cancellation)

/**
 * Cancel an ongoing payment by the buyer.
 *
 * 1. Cancels the Stripe PaymentIntent.
 * 2. Updates PaymentAttempt to CANCELLED.
 * 3. Updates Order paymentStatus to CANCELLED.
 * 4. Keeps order status in PAYMENT so the buyer can try again.
 */
export async function cancelPayment(orderId: string): Promise<void> {
  if (!orderId) {
    throw new PaymentError("orderId is required");
  }

  const paymentAttempt = await prisma.paymentAttempt.findFirst({
    where: {
      orderId,
      status: PaymentStatusEnum.PENDING,
    },
  });

  if (!paymentAttempt) {
    throw new PaymentError("No active payment to cancel");
  }

  // Cancel in Stripe
  if (paymentAttempt.paymentIntentId) {
    try {
      await stripe.paymentIntents.cancel(paymentAttempt.paymentIntentId);
    } catch {
      // Stripe cancel failed — still mark locally so the order
      // is not left in a stuck state.
    }
  }

  // Update local state
  await prisma.$transaction(async (tx) => {
    await tx.paymentAttempt.update({
      where: { id: paymentAttempt.id },
      data: { status: PaymentStatusEnum.CANCELLED },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: PaymentStatusEnum.CANCELLED },
    });
  });
}
