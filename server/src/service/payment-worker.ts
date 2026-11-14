import type Stripe from "stripe";
import prisma from "../lib/prisma";
import { processWebhookEvent, reconcileExpiredPayments } from "./payment";
import { processRefund, reconcileRefund, retryRestocking } from "./refund";

export async function runPaymentReconciliation() {
  const events = await prisma.stripeWebhookEvent.findMany({
    where: {
      OR: [{ processedAt: null }, { processedAt: { isSet: false } }],
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: { nextAttemptAt: "asc" },
    take: 50,
  });
  for (const event of events) {
    try {
      await processWebhookEvent(event.payload as unknown as Stripe.Event);
    } catch {
      /* The persisted receipt records the error and next retry time. */
    }
  }
  await reconcileExpiredPayments();
  const compensation = await prisma.paymentAttempt.findMany({
    where: {
      needsRefund: true,
      status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED"] },
    },
    orderBy: { updatedAt: "asc" },
    take: 50,
  });
  for (const attempt of compensation) {
    try {
      const failed = await prisma.refund.count({
        where: {
          paymentAttemptId: attempt.id,
          status: { in: ["FAILED", "CANCELLED"] },
        },
      });
      await processRefund({
        paymentAttemptId: attempt.id,
        requestId: "compensation:" + attempt.id + ":" + failed,
      });
    } catch (error) {
      console.error(
        "Compensation refund deferred",
        attempt.id,
        error instanceof Error ? error.message : "Unknown failure",
      );
    }
  }
  const refunds = await prisma.refund.findMany({
    where: {
      OR: [
        { status: { in: ["CREATED", "PENDING"] } },
        { status: "SUCCEEDED", restockPending: true },
      ],
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: { nextAttemptAt: "asc" },
    take: 50,
  });
  for (const refund of refunds) {
    if (refund.status === "SUCCEEDED") await retryRestocking(refund.id);
    else await reconcileRefund(refund.id);
  }
}

export function startPaymentWorker(intervalMs = 15_000) {
  let current: Promise<void> | undefined;
  const tick = () => {
    if (current) return;
    current = runPaymentReconciliation()
      .catch((error) =>
        console.error(
          "Payment recovery cycle failed",
          error instanceof Error ? error.message : "Unknown failure",
        ),
      )
      .finally(() => {
        current = undefined;
      });
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  tick();
  return async () => {
    clearInterval(timer);
    await current;
  };
}
