import { createHash, randomUUID } from "node:crypto";
import { priceOrder, normalizeTickets } from "./pricing";
import {
  HOLD_DURATION_MS,
  inventoryTransaction,
  lockInventory,
  reservedQuantities,
  ReservationError,
} from "./reservation";
import prisma from "../lib/prisma";
import { CreateOrderDto, UpdateOrderDto } from "../types/order";
import {
  TicketType as TicketTypeEnum,
  OrderStatus as OrderStatusEnum,
} from "../../generated/prisma/enums";

export async function createOrder(dto: CreateOrderDto) {
  const lines = normalizeTickets(dto.tickets);
  if (
    (dto.addOns !== undefined && !Array.isArray(dto.addOns)) ||
    (dto.promoCode !== undefined && typeof dto.promoCode !== "string")
  )
    throw new ReservationError("Invalid add-ons or promo code");
  // Fees will be calculated by the pricing service; clients cannot set a fee.
  if (dto.serviceFee !== undefined && dto.serviceFee !== 0)
    throw new ReservationError(
      "Service fees cannot be supplied by the customer",
    );
  if (
    dto.requestId !== undefined &&
    (typeof dto.requestId !== "string" ||
      dto.requestId.length < 8 ||
      dto.requestId.length > 128)
  )
    throw new ReservationError("A valid checkout request ID is required");
  const requestKey = createHash("sha256")
    .update(dto.userId + ":" + (dto.requestId ?? randomUUID()))
    .digest("hex");
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        tickets: [...lines.values()].sort((a, b) =>
          (a.eventId + a.type).localeCompare(b.eventId + b.type),
        ),
        addOns: [...new Set(dto.addOns ?? [])].sort(),
        promoCode: dto.promoCode?.trim().toUpperCase() || "",
      }),
    )
    .digest("hex");
  return inventoryTransaction(async (tx) => {
    const existing = await tx.checkoutRequest.findUnique({
      where: { id: requestKey },
    });
    if (existing) {
      if (existing.fingerprint !== fingerprint)
        throw new ReservationError(
          "Checkout request ID was already used for a different cart",
        );
      return tx.order.findUniqueOrThrow({ where: { id: existing.orderId } });
    }
    const orderId = randomUUID();
    await tx.checkoutRequest.create({
      data: { id: requestKey, fingerprint, orderId },
    });
    const eventIds = [
      ...new Set([...lines.values()].map((line) => line.eventId)),
    ];
    await lockInventory(tx, eventIds);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + HOLD_DURATION_MS);
    const events = await tx.event.findMany({
      where: { id: { in: eventIds } },
      include: { venue: true },
    });
    const reserved = await reservedQuantities(tx, eventIds, now);
    const tickets = [...lines.values()].map((line) => {
      const event = events.find((event) => event.id === line.eventId)!;
      if (event.date <= now)
        throw new ReservationError("Cannot reserve tickets for a past event");
      const ticket = event.tickets.find((ticket) => ticket.type === line.type);
      if (
        !ticket ||
        line.quantity >
          ticket.quantity - (reserved.get(line.eventId + ":" + line.type) ?? 0)
      ) {
        throw new ReservationError(
          "Not enough " + line.type + " tickets available for " + event.title,
        );
      }
      return { ...line, price: ticket.price };
    });
    const pricing = priceOrder(tickets, dto.addOns, dto.promoCode);
    return tx.order.create({
      data: {
        id: orderId,
        userId: dto.userId,
        createdAt: now,
        expiresAt,
        status: OrderStatusEnum.TICKET_SELECTION,
        paymentStatus: "NOT_STARTED",
        ...pricing,
        tickets,
        events: events.map((event) => ({
          id: event.id,
          title: event.title,
          date: event.date,
          time: event.time,
          venueId: event.venueId,
          venueName: event.venue.name,
        })),
        reservations: {
          create: tickets.map((ticket) => ({
            eventId: ticket.eventId,
            ticketType: ticket.type,
            quantity: ticket.quantity,
            expiresAt,
          })),
        },
      },
    });
  });
}

export async function getOrders() {
  return prisma.order.findMany({
    include: {
      payments: true,
    },
  });
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      payments: true,
    },
  });
}

export async function updateOrder(
  _id: string,
  _dto: UpdateOrderDto,
): Promise<never> {
  throw new ReservationError(
    "Order state is managed by checkout and payment operations",
  );
}

export async function deleteOrder(id: string) {
  return inventoryTransaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id },
      include: { payments: true },
    });
    await lockInventory(
      tx,
      order.tickets.map((ticket) => ticket.eventId),
    );
    if (
      order.payments.length ||
      order.status === "PAYMENT" ||
      order.paymentStatus !== "NOT_STARTED"
    ) {
      throw new ReservationError(
        "Cancel or reconcile payment before removing an order",
      );
    }
    await tx.ticketReservation.deleteMany({ where: { orderId: id } });
    return tx.order.delete({ where: { id } });
  });
}

export async function getOrdersByUserId(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: {
      payments: true,
    },
  });
}
