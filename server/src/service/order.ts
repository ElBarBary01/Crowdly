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
  if (!Array.isArray(dto.tickets) || dto.tickets.length === 0)
    throw new ReservationError("At least one ticket is required");
  const lines = new Map<
    string,
    { eventId: string; type: TicketTypeEnum; quantity: number }
  >();
  for (const ticket of dto.tickets) {
    if (
      !ticket ||
      typeof ticket.eventId !== "string" ||
      !ticket.eventId ||
      typeof ticket.type !== "string" ||
      !Number.isSafeInteger(ticket.quantity) ||
      ticket.quantity <= 0
    )
      throw new ReservationError(
        "Tickets require an event, category, and positive integer quantity",
      );
    const type = ticket.type.toUpperCase() as TicketTypeEnum;
    if (!Object.values(TicketTypeEnum).includes(type))
      throw new ReservationError("Invalid ticket category");
    const key = ticket.eventId + ":" + type;
    const quantity = (lines.get(key)?.quantity ?? 0) + ticket.quantity;
    if (!Number.isSafeInteger(quantity))
      throw new ReservationError("Ticket quantity is too large");
    lines.set(key, { eventId: ticket.eventId, type, quantity });
  }
  // Fees will be calculated by the pricing service; clients cannot set a fee.
  if (dto.serviceFee !== undefined && dto.serviceFee !== 0)
    throw new ReservationError(
      "Service fees cannot be supplied by the customer",
    );
  return inventoryTransaction(async (tx) => {
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
    const totalPrice =
      tickets.reduce(
        (sum, ticket) => sum + Math.round(ticket.price * 100) * ticket.quantity,
        0,
      ) / 100;
    return tx.order.create({
      data: {
        userId: dto.userId,
        createdAt: now,
        expiresAt,
        status: OrderStatusEnum.TICKET_SELECTION,
        paymentStatus: "NOT_STARTED",
        serviceFee: 0,
        totalPrice,
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
