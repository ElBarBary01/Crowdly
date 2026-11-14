import type Stripe from "stripe";
import type {
  Order,
  PaymentAttempt,
  Prisma,
} from "../../generated/prisma/client";
import prisma from "../lib/prisma";
import { stripe } from "../lib/stripe";
import {
  activateReservations,
  inventoryTransaction,
  lockInventory,
  reservedQuantities,
  releaseCancelledReservations,
  ReservationError,
} from "./reservation";
import { moneyAmount } from "./pricing";
import { applyStripeRefund } from "./refund";
import { PaymentError, WebhookSignatureError } from "./payment-error";
import type { CreatePaymentCheckoutDto } from "../types/payment";
export { PaymentError, WebhookSignatureError } from "./payment-error";
export { processRefund } from "./refund";

const FUNDED = ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;
const RETRY_MS = 30_000;
const funded = (status: string) =>
  (FUNDED as readonly string[]).includes(status);
const amountOf = (order: Order) =>
  order.totalAmount ?? moneyAmount(order.totalPrice);

async function prepareAttempt(order: Order) {
  return inventoryTransaction(async (tx) => {
    // Also upgrades stage-two orders that already have an intent reference.
    const previous = await tx.paymentAttempt.findFirst({
      where: { orderId: order.id, provider: "STRIPE" },
      orderBy: { createdAt: "asc" },
    });
    if (previous) return previous;
    return tx.paymentAttempt.upsert({
      where: { providerReference: "checkout:" + order.id },
      update: {},
      create: {
        orderId: order.id,
        provider: "STRIPE",
        providerReference: "checkout:" + order.id,
        paymentIntentId: null,
        amount: amountOf(order) / 100,
        amountMinor: amountOf(order),
        currency: order.currency,
        method: "CARD",
        status: "PENDING",
      },
    });
  });
}

async function recoverIntent(
  order: Order,
  attempt: PaymentAttempt,
): Promise<Stripe.PaymentIntent> {
  let intent: Stripe.PaymentIntent | undefined;
  if (attempt.paymentIntentId)
    intent = await stripe.paymentIntents.retrieve(attempt.paymentIntentId);
  else if (Date.now() - attempt.createdAt.getTime() < 23 * 60 * 60 * 1000) {
    // Keep stage-two parameters unchanged when recovering its ambiguous create.
    intent = await stripe.paymentIntents.create(
      {
        amount: amountOf(order),
        currency: order.currency,
        metadata: { orderId: order.id },
        payment_method_types: ["card"],
      },
      { idempotencyKey: "crowdly-order:" + order.id },
    );
  } else {
    // A reused key may create a second intent after retention expires. Search
    // instead; leave the allocation protected if the outcome remains unknown.
    const safeId = order.id.replace(/['\\]/g, "");
    const matches = await stripe.paymentIntents.search({
      query: "metadata['orderId']:'" + safeId + "'",
      limit: 100,
    });
    if (matches.data.length === 1) intent = matches.data[0];
    else
      throw new PaymentError(
        "Ambiguous payment creation requires manual reconciliation",
      );
  }
  if (
    intent.object !== "payment_intent" ||
    intent.metadata?.orderId !== order.id ||
    intent.amount !== amountOf(order) ||
    intent.currency !== order.currency
  )
    throw new PaymentError("Stripe payment does not match this order");
  await prisma.paymentAttempt.updateMany({
    where: {
      id: attempt.id,
      OR: [{ paymentIntentId: null }, { paymentIntentId: { isSet: false } }],
    },
    data: { paymentIntentId: intent.id },
  });
  return intent;
}

export async function createPaymentCheckout(dto: CreatePaymentCheckoutDto) {
  if (!dto || typeof dto.orderId !== "string")
    throw new PaymentError("orderId is required");
  if (dto.method && dto.method !== "CARD")
    throw new PaymentError("Only card payments are supported");
  let order: Order;
  try {
    order = await activateReservations(dto.orderId);
  } catch (error) {
    if (error instanceof ReservationError)
      throw new PaymentError(error.message);
    throw error;
  }
  const attempt = await prepareAttempt(order);
  let intent: Stripe.PaymentIntent;
  try {
    intent = await recoverIntent(order, attempt);
  } catch (error) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        fulfillmentError:
          error instanceof Error
            ? error.message
            : "Payment creation is awaiting reconciliation",
      },
    });
    throw new PaymentError(
      "Unable to start payment; retry this order to resume",
    );
  }
  await applyPaymentIntent(intent);
  const stored = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
  });
  if (intent.status === "canceled")
    throw new PaymentError(
      "This payment was cancelled; start a new reservation",
    );
  return {
    paymentIntentId: intent.id,
    clientSecret: intent.status === "succeeded" ? null : intent.client_secret,
    paymentAttemptId: attempt.id,
    amount: amountOf(order) / 100,
    amountMinor: amountOf(order),
    currency: order.currency,
    status: stored.paymentStatus,
    orderStatus: stored.status,
    expiresAt: order.expiresAt,
    serverNow: new Date(),
  };
}

/** The same guarded transaction is used by webhooks and Stripe reconciliation. */
export async function applyPaymentIntent(
  pi: Stripe.PaymentIntent,
  failedAttempt = false,
) {
  const orderId = pi.metadata?.orderId;
  if (!orderId || pi.object !== "payment_intent") return;
  await inventoryTransaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findFirst({
      where: {
        orderId,
        provider: "STRIPE",
        OR: [
          { paymentIntentId: pi.id },
          { providerReference: "checkout:" + orderId, paymentIntentId: null },
        ],
      },
      include: { order: true },
    });
    if (!attempt)
      throw new PaymentError(
        "Payment attempt is not available for this webhook",
      );
    const order = attempt.order;
    const paid = attempt.amountMinor ?? moneyAmount(attempt.amount);
    if (
      pi.amount !== paid ||
      pi.currency !== attempt.currency ||
      paid !== amountOf(order)
    )
      throw new PaymentError(
        "Payment does not match the order amount or currency",
      );
    if (pi.status === "succeeded" && pi.amount_received !== paid)
      throw new PaymentError("Received amount does not match the order");
    const next =
      pi.status === "succeeded"
        ? attempt.refundedAmount >= paid
          ? "REFUNDED"
          : attempt.refundedAmount > 0
            ? "PARTIALLY_REFUNDED"
            : "SUCCEEDED"
        : pi.status === "canceled"
          ? "CANCELLED"
          : pi.status === "requires_payment_method" &&
              (pi.last_payment_error || failedAttempt)
            ? "FAILED"
            : "PENDING";
    if (funded(attempt.status) && pi.status !== "succeeded") return;
    if (attempt.status === "CANCELLED" && next !== "SUCCEEDED") return;
    if (next !== "SUCCEEDED" && next !== "PARTIALLY_REFUNDED") {
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: next, paymentIntentId: pi.id },
      });
      if (next === "CANCELLED") await releaseCancelledReservations(tx, orderId);
      if (!funded(order.paymentStatus))
        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: next,
            ...(next === "CANCELLED"
              ? {
                  status:
                    order.expiresAt && order.expiresAt <= new Date()
                      ? "EXPIRED"
                      : "CANCELLED",
                }
              : {}),
          },
        });
      return;
    }
    // A paid order can have a duplicate successful intent. Record and refund
    // the additional charge without fulfilling or invalidating the primary sale.
    const previousPaid =
      order.paidAttemptId ??
      (order.status === "CONFIRMATION" && funded(order.paymentStatus)
        ? (
            await tx.paymentAttempt.findFirst({
              where: { orderId, status: { in: [...FUNDED] } },
              orderBy: { createdAt: "asc" },
            })
          )?.id
        : undefined);
    if (previousPaid) {
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: next,
          paymentIntentId: pi.id,
          ...(previousPaid !== attempt.id
            ? {
                needsRefund: true,
                fulfillmentError: "Duplicate successful payment",
              }
            : {}),
        },
      });
      if (!order.paidAttemptId)
        await tx.order.update({
          where: { id: orderId },
          data: { paidAttemptId: previousPaid },
        });
      return;
    }
    const grouped = new Map<string, (typeof order.tickets)[number]>();
    for (const ticket of order.tickets) {
      const key = ticket.eventId + ":" + ticket.type;
      const previous = grouped.get(key);
      grouped.set(key, {
        ...ticket,
        quantity: ticket.quantity + (previous?.quantity ?? 0),
      });
    }
    const tickets = [...grouped.values()];
    await lockInventory(
      tx,
      tickets.map((ticket) => ticket.eventId),
      false,
    );
    const holds = await tx.ticketReservation.findMany({ where: { orderId } });
    const totals = await reservedQuantities(
      tx,
      tickets.map((ticket) => ticket.eventId),
      new Date(),
    );
    let reason: string | undefined = order.tickets.some(
      (ticket) =>
        !Number.isSafeInteger(ticket.quantity) ||
        ticket.quantity <= 0 ||
        !ticket.eventId,
    )
      ? "Invalid ticket snapshot"
      : undefined;
    if (
      order.expiresAt &&
      (holds.length !== tickets.length ||
        !tickets.every((ticket) =>
          holds.some(
            (hold) =>
              hold.eventId === ticket.eventId &&
              hold.ticketType === ticket.type &&
              hold.quantity === ticket.quantity &&
              hold.status === "PAYMENT_ACTIVE",
          ),
        ))
    )
      reason = "Ticket allocation is no longer valid";
    if (!tickets.length) reason = "Order has no tickets";
    for (const ticket of tickets) {
      const event = await tx.event.findUnique({
        where: { id: ticket.eventId },
      });
      const own = holds
        .filter(
          (hold) =>
            hold.eventId === ticket.eventId &&
            hold.ticketType === ticket.type &&
            (hold.status === "PAYMENT_ACTIVE" ||
              (hold.status === "HELD" && hold.expiresAt > new Date())),
        )
        .reduce((sum, hold) => sum + hold.quantity, 0);
      const stock =
        event?.tickets.find((item) => item.type === ticket.type)?.quantity ?? 0;
      const others =
        (totals.get(ticket.eventId + ":" + ticket.type) ?? 0) - own;
      if (
        !Number.isSafeInteger(ticket.quantity) ||
        ticket.quantity <= 0 ||
        stock - others < ticket.quantity
      )
        reason = "Inventory cannot fulfill this paid order";
    }
    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: next,
        paymentIntentId: pi.id,
        needsRefund: Boolean(reason),
        fulfillmentError: reason ?? null,
      },
    });
    await tx.order.update({
      where: { id: orderId },
      data: {
        paidAttemptId: attempt.id,
        paymentStatus: next,
        status: reason ? "PAYMENT_REVIEW" : "CONFIRMATION",
        nextPaymentCheckAt: new Date(Date.now() + RETRY_MS),
      },
    });
    if (reason) return;
    for (const ticket of tickets) {
      const update = await tx.event.updateMany({
        where: {
          id: ticket.eventId,
          tickets: {
            some: { type: ticket.type, quantity: { gte: ticket.quantity } },
          },
        },
        data: {
          tickets: {
            updateMany: {
              where: { type: ticket.type },
              data: { quantity: { decrement: ticket.quantity } },
            },
          },
        },
      });
      if (update.count !== 1)
        throw new PaymentError("Inventory changed while fulfilling the order");
    }
    await tx.ticketReservation.updateMany({
      where: { orderId, status: "PAYMENT_ACTIVE" },
      data: { status: "CONSUMED" },
    });
  });
}

const PAYMENT_EVENTS = new Set([
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "payment_intent.processing",
]);
const REFUND_EVENTS = new Set([
  "refund.created",
  "refund.updated",
  "refund.failed",
]);
export async function processWebhookEvent(event: Stripe.Event) {
  if (!PAYMENT_EVENTS.has(event.type) && !REFUND_EVENTS.has(event.type)) return;
  if (
    PAYMENT_EVENTS.has(event.type) &&
    (event.data.object.object !== "payment_intent" ||
      !(event.data.object as Stripe.PaymentIntent).metadata?.orderId)
  )
    return;
  const record = await prisma.stripeWebhookEvent.upsert({
    where: { id: event.id },
    update: {},
    create: {
      id: event.id,
      type: event.type,
      payload: JSON.parse(JSON.stringify(event)) as Prisma.InputJsonValue,
    },
  });
  if (record.processedAt) return;
  try {
    if (PAYMENT_EVENTS.has(event.type)) {
      const pi = event.data.object as Stripe.PaymentIntent;
      // A failure snapshot is retryable. Use its state without terminalizing
      // the intent; subsequent success is still processed.
      await applyPaymentIntent(
        pi,
        event.type === "payment_intent.payment_failed",
      );
    } else if (event.data.object.object === "refund")
      await applyStripeRefund(event.data.object as Stripe.Refund);
    await prisma.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date(), lastError: null },
    });
  } catch (error) {
    await prisma.stripeWebhookEvent.update({
      where: { id: event.id },
      data: {
        lastError:
          error instanceof Error ? error.message : "Webhook processing failed",
        nextAttemptAt: new Date(Date.now() + RETRY_MS),
      },
    });
    throw error;
  }
}

export async function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
) {
  if (!process.env.STRIPE_WEBHOOK_SECRET)
    throw new PaymentError("STRIPE_WEBHOOK_SECRET is not configured");
  try {
    return await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    throw new WebhookSignatureError();
  }
}

async function releaseUnpaid(orderId: string, cancel: boolean) {
  return inventoryTransaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payments: true, reservations: true },
    });
    if (
      order.payments.length ||
      order.reservations.some((hold) => hold.status === "PAYMENT_ACTIVE")
    )
      return false;
    if (funded(order.paymentStatus)) return false;
    if (!cancel && (!order.expiresAt || order.expiresAt > new Date()))
      return false;
    await lockInventory(
      tx,
      order.tickets.map((ticket) => ticket.eventId),
    );
    await tx.ticketReservation.updateMany({
      where: { orderId, status: "HELD" },
      data: { status: "RELEASED" },
    });
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: cancel ? "CANCELLED" : "EXPIRED",
        paymentStatus: "CANCELLED",
      },
    });
    return true;
  });
}

export async function reconcileOrderPayment(orderId: string, cancel = false) {
  if (await releaseUnpaid(orderId, cancel)) return;
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { reservations: true, payments: true },
  });
  if (funded(order.paymentStatus) && order.status !== "PAYMENT_REVIEW") return;
  if (
    !order.payments.length &&
    !order.reservations.some((hold) => hold.status === "PAYMENT_ACTIVE")
  )
    return;
  const attempt = await prepareAttempt(order);
  let intent = await recoverIntent(order, attempt);
  const expired = order.expiresAt
    ? order.expiresAt <= new Date()
    : Date.now() - attempt.createdAt.getTime() > 15 * 60 * 1000;
  if (
    (cancel || expired) &&
    !["succeeded", "canceled", "processing"].includes(intent.status)
  ) {
    try {
      intent = await stripe.paymentIntents.cancel(intent.id);
    } catch {
      // Cancellation can race a successful confirmation. Retrieve the outcome;
      // never release inventory merely because cancellation failed.
      intent = await stripe.paymentIntents.retrieve(intent.id);
      if (!["succeeded", "canceled", "processing"].includes(intent.status))
        throw new PaymentError(
          "Cancellation is uncertain; the reservation remains protected",
        );
    }
  }
  await applyPaymentIntent(intent);
}

export async function cancelPayment(orderId: string) {
  if (!orderId) throw new PaymentError("orderId is required");
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
  });
  if (funded(order.paymentStatus))
    throw new PaymentError("Paid orders require a refund to cancel tickets");
  await reconcileOrderPayment(orderId, true);
}

export async function reconcileExpiredPayments() {
  const due = await prisma.order.findMany({
    where: {
      OR: [
        { reservations: { some: { status: "PAYMENT_ACTIVE" } } },
        {
          reservations: {
            some: { status: "HELD", expiresAt: { lte: new Date() } },
          },
        },
        { payments: { some: { status: { in: ["PENDING", "FAILED"] } } } },
      ],
      AND: [
        {
          OR: [
            { nextPaymentCheckAt: { lte: new Date() } },
            { nextPaymentCheckAt: { isSet: false } },
          ],
        },
      ],
    },
    orderBy: { nextPaymentCheckAt: "asc" },
    take: 50,
  });
  let processed = 0;
  for (const order of due) {
    await prisma.order.update({
      where: { id: order.id },
      data: { nextPaymentCheckAt: new Date(Date.now() + RETRY_MS) },
    });
    try {
      await reconcileOrderPayment(order.id);
      processed++;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown failure";
      await prisma.paymentAttempt.updateMany({
        where: { orderId: order.id, status: { in: ["PENDING", "FAILED"] } },
        data: { fulfillmentError: message },
      });
      if (/manual reconciliation|does not match/.test(message))
        await prisma.order.updateMany({
          where: { id: order.id, paymentStatus: { in: ["PENDING", "FAILED"] } },
          data: { status: "PAYMENT_REVIEW" },
        });
      console.error("Payment reconciliation deferred", order.id, message);
    }
  }
  return processed;
}
