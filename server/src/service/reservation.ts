import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import prisma from "../lib/prisma";
import type { Prisma, Ticket } from "../../generated/prisma/client";

export const HOLD_DURATION_MS = 15 * 60 * 1000;

export class ReservationError extends Error {}

export async function inventoryTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, { timeout: 10_000 });
    } catch (error) {
      if (
        attempt >= 7 ||
        !(error instanceof Error) ||
        !("code" in error) ||
        !["P2034", "P2002"].includes(String(error.code))
      )
        throw error;
      await delay(10 * (attempt + 1) + Math.random() * 25);
    }
  }
}

// A real write to each shared event makes competing stock decisions conflict.
// Re-enter the entire transaction with a fresh snapshot on a write conflict.
export async function lockInventory(
  tx: Prisma.TransactionClient,
  eventIds: string[],
  requireExisting = true,
) {
  for (const id of [...new Set(eventIds)].sort()) {
    const result = await tx.event.updateMany({
      where: { id },
      data: { inventoryRevision: randomUUID() },
    });
    if (requireExisting && result.count !== 1)
      throw new ReservationError("Event is no longer available");
  }
}

export function blockingReservations(
  now: Date,
): Prisma.TicketReservationWhereInput {
  return {
    OR: [
      { status: "HELD", expiresAt: { gt: now } },
      // An exposed Stripe client secret may remain chargeable after the deadline.
      { status: "PAYMENT_ACTIVE" },
    ],
  };
}

export async function reservedQuantities(
  tx: Prisma.TransactionClient,
  eventIds: string[],
  now: Date,
) {
  const reservations = await tx.ticketReservation.findMany({
    where: { eventId: { in: eventIds }, ...blockingReservations(now) },
  });
  const totals = new Map<string, number>();
  for (const reservation of reservations) {
    const key = `${reservation.eventId}:${reservation.ticketType}`;
    totals.set(key, (totals.get(key) ?? 0) + reservation.quantity);
  }
  return totals;
}

/** Read stock and its holds in one snapshot, shared by every public event view. */
export async function withAvailability<
  T extends { id: string; tickets: Ticket[]; venue: object },
>(events: T[]) {
  return prisma.$transaction(async (tx) => {
    const ids = events.map((event) => event.id);
    const current = await tx.event.findMany({ where: { id: { in: ids } } });
    const serverNow = new Date();
    const reserved = await reservedQuantities(tx, ids, serverNow);
    return events.flatMap((event) => {
      const live = current.find((item) => item.id === event.id);
      if (!live) return [];
      const tickets = live.tickets.map((ticket) => {
        const reservedQuantity =
          reserved.get(`${event.id}:${ticket.type}`) ?? 0;
        const availableQuantity = Math.max(
          0,
          ticket.quantity - reservedQuantity,
        );
        return {
          ...ticket,
          quantity: availableQuantity,
          availableQuantity,
          reservedQuantity,
        };
      });
      return [
        {
          ...event,
          tickets,
          serverNow,
          availableQuantity: tickets.reduce(
            (sum, ticket) => sum + ticket.availableQuantity,
            0,
          ),
          reservedQuantity: tickets.reduce(
            (sum, ticket) => sum + ticket.reservedQuantity,
            0,
          ),
          venue: {
            ...event.venue,
            ticketsLeft: tickets.reduce(
              (sum, ticket) => sum + ticket.quantity,
              0,
            ),
          },
        },
      ];
    });
  });
}

export async function activateReservations(orderId: string) {
  return inventoryTransaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { reservations: true },
    });
    await lockInventory(
      tx,
      order.tickets.map((ticket) => ticket.eventId),
    );
    const now = new Date();
    if (!order.expiresAt || order.expiresAt <= now)
      throw new ReservationError(
        "Ticket reservation has expired; create a new order",
      );
    if (!Number.isFinite(order.totalPrice) || order.totalPrice <= 0)
      throw new ReservationError("Order total must be positive");
    if (
      ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED", "CANCELLED"].includes(
        order.paymentStatus,
      ) ||
      ["EXPIRED", "CANCELLED", "PAYMENT_REVIEW"].includes(order.status)
    )
      throw new ReservationError("Order is no longer payable");
    if (
      order.reservations.length !== order.tickets.length ||
      order.reservations.length === 0
    )
      throw new ReservationError("Order has no valid ticket reservation");
    for (const ticket of order.tickets) {
      const hold = order.reservations.find(
        (item) =>
          item.eventId === ticket.eventId && item.ticketType === ticket.type,
      );
      if (
        !hold ||
        hold.quantity !== ticket.quantity ||
        !["HELD", "PAYMENT_ACTIVE"].includes(hold.status) ||
        hold.expiresAt <= now
      ) {
        throw new ReservationError("Order has no valid ticket reservation");
      }
    }
    await tx.ticketReservation.updateMany({
      where: { orderId, status: "HELD" },
      data: { status: "PAYMENT_ACTIVE" },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { status: "PAYMENT", paymentStatus: "PENDING" },
    });
    return order;
  });
}

export async function releaseCancelledReservations(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const chargeableAttempts = await tx.paymentAttempt.count({
    where: { orderId, status: { in: ["PENDING", "FAILED"] } },
  });
  if (chargeableAttempts > 0) return;
  const holds = await tx.ticketReservation.findMany({
    where: { orderId, status: "PAYMENT_ACTIVE" },
  });
  await lockInventory(
    tx,
    holds.map((hold) => hold.eventId),
    false,
  );
  await tx.ticketReservation.updateMany({
    where: { orderId, status: "PAYMENT_ACTIVE" },
    data: { status: "RELEASED" },
  });
}
