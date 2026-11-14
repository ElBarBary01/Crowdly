import { createHash, randomUUID } from "node:crypto";
import type Stripe from "stripe";
import prisma from "../lib/prisma";
import { stripe } from "../lib/stripe";
import {
  inventoryTransaction,
  lockInventory,
  releaseCancelledReservations,
} from "./reservation";
import { moneyAmount } from "./pricing";
import { PaymentError } from "./payment-error";
import type { CreateRefundDto } from "../types/payment";

const fundedStatuses = ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

export async function processRefund(dto: CreateRefundDto) {
  if (
    !dto ||
    typeof dto.paymentAttemptId !== "string" ||
    typeof dto.requestId !== "string" ||
    dto.requestId.length < 8 ||
    dto.requestId.length > 128
  )
    throw new PaymentError(
      "Payment attempt and a stable refund request ID are required",
    );
  if (
    dto.restockTickets !== undefined &&
    typeof dto.restockTickets !== "boolean"
  )
    throw new PaymentError("restockTickets must be a boolean");
  let explicitAmount: number | undefined;
  try {
    explicitAmount =
      dto.amount === undefined ? undefined : moneyAmount(dto.amount);
  } catch (error) {
    throw new PaymentError(
      error instanceof Error ? error.message : "Invalid refund amount",
    );
  }
  if (explicitAmount === 0)
    throw new PaymentError("Refund amount must be greater than zero");
  const key = createHash("sha256")
    .update(dto.paymentAttemptId + ":" + dto.requestId)
    .digest("hex");
  const refund = await inventoryTransaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({
      where: { id: dto.paymentAttemptId },
    });
    if (!attempt?.paymentIntentId)
      throw new PaymentError("Payment attempt not found");
    // Serialize concurrent refund allocations against the same payment.
    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: { refundRevision: randomUUID() },
    });
    const existing = await tx.refund.findUnique({ where: { requestKey: key } });
    if (existing) {
      if (
        (explicitAmount !== undefined && existing.amount !== explicitAmount) ||
        existing.restockTickets !== (dto.restockTickets ?? false)
      )
        throw new PaymentError(
          "Refund request ID was already used with different parameters",
        );
      return existing;
    }
    if (!(fundedStatuses as readonly string[]).includes(attempt.status))
      throw new PaymentError("Can only refund successful payments");
    const allocations = await tx.refund.findMany({
      where: {
        paymentAttemptId: attempt.id,
        status: { in: ["CREATED", "PENDING", "SUCCEEDED"] },
      },
    });
    const paid = attempt.amountMinor ?? moneyAmount(attempt.amount);
    const reserved = allocations.reduce((sum, item) => sum + item.amount, 0);
    const amount = explicitAmount ?? paid - reserved;
    if (amount <= 0 || amount > paid - reserved)
      throw new PaymentError("Refund exceeds the unallocated payment balance");
    if (
      dto.restockTickets &&
      allocations
        .filter((item) => item.status === "SUCCEEDED")
        .reduce((sum, item) => sum + item.amount, 0) +
        amount !==
        paid
    )
      throw new PaymentError(
        "Ticket restocking requires a full successful refund",
      );
    return tx.refund.create({
      data: {
        paymentAttemptId: attempt.id,
        requestKey: key,
        amount,
        currency: attempt.currency,
        restockTickets: dto.restockTickets ?? false,
      },
    });
  });
  await reconcileRefund(refund.id);
  const updated = await prisma.refund.findUniqueOrThrow({
    where: { id: refund.id },
  });
  return {
    refundId: updated.stripeRefundId,
    requestId: dto.requestId,
    refundRecordId: updated.id,
    amount: updated.amount / 100,
    status: updated.status,
  };
}

export async function applyStripeRefund(remote: Stripe.Refund) {
  const intentId =
    typeof remote.payment_intent === "string"
      ? remote.payment_intent
      : remote.payment_intent?.id;
  if (!intentId) return;
  const restockId = await inventoryTransaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findFirst({
      where: { paymentIntentId: intentId },
      include: { order: true },
    });
    if (!attempt) throw new PaymentError("Refund payment is not available yet");
    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: { refundRevision: randomUUID() },
    });
    let local = remote.metadata?.refundId
      ? await tx.refund.findUnique({ where: { id: remote.metadata.refundId } })
      : null;
    local ??= await tx.refund.findFirst({
      where: { stripeRefundId: remote.id },
    });
    if (!local)
      local = await tx.refund.create({
        data: {
          paymentAttemptId: attempt.id,
          requestKey: `external:${remote.id}`,
          stripeRefundId: remote.id,
          amount: remote.amount,
          currency: remote.currency,
        },
      });
    if (
      local.paymentAttemptId !== attempt.id ||
      local.amount !== remote.amount ||
      local.currency !== remote.currency
    )
      throw new PaymentError("Refund does not match its local allocation");
    const status =
      remote.status === "succeeded"
        ? "SUCCEEDED"
        : remote.status === "failed"
          ? "FAILED"
          : remote.status === "canceled"
            ? "CANCELLED"
            : "PENDING";
    if (local.status === "SUCCEEDED")
      return local.restockPending ? local.id : undefined;
    if (["FAILED", "CANCELLED"].includes(local.status) && status === "PENDING")
      return;
    await tx.refund.update({
      where: { id: local.id },
      data: {
        status,
        stripeRefundId: remote.id,
        lastError: null,
        nextAttemptAt: new Date(Date.now() + 30_000),
      },
    });
    const successful = await tx.refund.findMany({
      where: { paymentAttemptId: attempt.id, status: "SUCCEEDED" },
    });
    const refundedAmount = successful.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const full =
      refundedAmount >= (attempt.amountMinor ?? moneyAmount(attempt.amount));
    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        refundedAmount,
        ...(refundedAmount > 0
          ? { status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" }
          : {}),
        ...(full ? { needsRefund: false } : {}),
      },
    });
    const primaryId =
      attempt.order.paidAttemptId ??
      (
        await tx.paymentAttempt.findFirst({
          where: {
            orderId: attempt.orderId,
            status: { in: [...fundedStatuses] },
          },
          orderBy: { createdAt: "asc" },
        })
      )?.id;
    if (primaryId !== attempt.id || refundedAmount === 0) return;
    await tx.order.update({
      where: { id: attempt.orderId },
      data: {
        paymentStatus: full ? "REFUNDED" : "PARTIALLY_REFUNDED",
        ...(full
          ? {
              status: "CANCELLED",
              ticketsCancelledAt:
                attempt.order.ticketsCancelledAt ?? new Date(),
            }
          : {}),
      },
    });
    if (!full) return;
    await releaseCancelledReservations(tx, attempt.orderId);
    if (
      attempt.order.inventoryReturnedAt ||
      !successful.some((item) => item.restockTickets)
    )
      return;
    const consumed = await tx.ticketReservation.count({
      where: { orderId: attempt.orderId, status: "CONSUMED" },
    });
    if (
      !consumed &&
      (attempt.order.expiresAt || attempt.order.status !== "CONFIRMATION")
    )
      return;
    const request = successful.find((item) => item.restockTickets)!;
    await tx.refund.update({
      where: { id: request.id },
      data: { restockPending: true },
    });
    return request.id;
  });
  // The financial result is durable even if inventory repair is necessary.
  if (restockId) await retryRestocking(restockId);
}

export async function retryRestocking(refundId: string) {
  try {
    await inventoryTransaction(async (tx) => {
      const refund = await tx.refund.findUniqueOrThrow({
        where: { id: refundId },
        include: { paymentAttempt: { include: { order: true } } },
      });
      const order = refund.paymentAttempt.order;
      if (
        refund.status !== "SUCCEEDED" ||
        !refund.restockPending ||
        !refund.restockTickets ||
        order.paymentStatus !== "REFUNDED"
      )
        return;
      if (!order.inventoryReturnedAt) {
        await lockInventory(
          tx,
          order.tickets.map((ticket) => ticket.eventId),
        );
        for (const ticket of order.tickets) {
          const changed = await tx.event.updateMany({
            where: {
              id: ticket.eventId,
              tickets: { some: { type: ticket.type } },
            },
            data: {
              tickets: {
                updateMany: {
                  where: { type: ticket.type },
                  data: { quantity: { increment: ticket.quantity } },
                },
              },
            },
          });
          if (changed.count !== 1)
            throw new PaymentError(
              "Refund succeeded; inventory category needs repair before restocking",
            );
        }
        await tx.ticketReservation.updateMany({
          where: { orderId: order.id, status: "CONSUMED" },
          data: { status: "RELEASED" },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { inventoryReturnedAt: new Date() },
        });
      }
      await tx.refund.update({
        where: { id: refundId },
        data: { restockPending: false, lastError: null },
      });
    });
  } catch (error) {
    await prisma.refund.update({
      where: { id: refundId },
      data: {
        lastError:
          error instanceof Error ? error.message : "Stock return needs review",
        nextAttemptAt: new Date(Date.now() + 30_000),
      },
    });
  }
}

export async function reconcileRefund(id: string) {
  const local = await prisma.refund.findUniqueOrThrow({
    where: { id },
    include: { paymentAttempt: true },
  });
  if (!["CREATED", "PENDING"].includes(local.status)) return;
  try {
    let remote: Stripe.Refund | undefined;
    if (local.stripeRefundId)
      remote = await stripe.refunds.retrieve(local.stripeRefundId);
    else if (Date.now() - local.createdAt.getTime() < 23 * 60 * 60 * 1000) {
      remote = await stripe.refunds.create(
        {
          payment_intent: local.paymentAttempt.paymentIntentId!,
          amount: local.amount,
          metadata: { refundId: local.id },
        },
        { idempotencyKey: `crowdly-refund:${local.id}` },
      );
    } else {
      // Do not recreate an ambiguous refund after Stripe's idempotency retention.
      for await (const item of stripe.refunds.list({
        payment_intent: local.paymentAttempt.paymentIntentId!,
        limit: 100,
      })) {
        if (item.metadata?.refundId === local.id) {
          remote = item;
          break;
        }
      }
      if (!remote)
        throw new PaymentError("Refund creation needs manual reconciliation");
    }
    await applyStripeRefund(remote);
  } catch (error) {
    await prisma.refund.update({
      where: { id },
      data: {
        lastError:
          error instanceof Error
            ? error.message
            : "Refund reconciliation failed",
        nextAttemptAt: new Date(Date.now() + 30_000),
      },
    });
    // Persist the uncertain request; the worker retries it using the same key.
  }
}
