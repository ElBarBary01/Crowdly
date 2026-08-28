import prisma from "../lib/prisma";
import { CreateOrderDto, UpdateOrderDto } from "../types/order";
import {
  TicketType as TicketTypeEnum,
  OrderStatus as OrderStatusEnum,
} from "../../generated/prisma/enums";

export async function createOrder(dto: CreateOrderDto) {
  const { userId, eventId, tickets } = dto;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      venue: true,
    },
  });
  if (!event) {
    throw new Error("Event not found");
  }
  if (event.date < new Date()) {
    throw new Error("Cannot create an order for a past event");
  }
  if (!tickets || tickets.length === 0) {
    throw new Error("At least one ticket is required");
  }
  const orderTickets = tickets.map((requestedTicket) => {
    const ticketType = requestedTicket.type.toUpperCase() as TicketTypeEnum;

    const eventTicket = event.tickets.find(
      (ticket) => ticket.type === ticketType,
    );

    if (!eventTicket) {
      throw new Error(
        `Ticket type ${requestedTicket.type} is not available for this event`,
      );
    }
    if (requestedTicket.quantity <= 0) {
      throw new Error("Ticket quantity must be greater than zero");
    }

    if (requestedTicket.quantity > eventTicket.quantity) {
      throw new Error(`Not enough ${requestedTicket.type} tickets available`);
    }
    return {
      type: ticketType,
      price: eventTicket.price,
      quantity: requestedTicket.quantity,
    };
  });
  const subtotal = orderTickets.reduce(
    (total, ticket) => total + ticket.price * ticket.quantity,
    0,
  );
  const serviceFee = 0;
  const totalPrice = subtotal + serviceFee;

  const orderEvent = {
    id: event.id,
    title: event.title,
    date: event.date,
    time: event.time,
    venueId: event.venueId,
    venueName: event.venue.name,
  };
  return prisma.order.create({
    data: {
      user: {
        connect: {
          id: userId,
        },
      },
      status: OrderStatusEnum.TICKET_SELECTION,
      paymentStatus: "NOT_STARTED",
      serviceFee,
      totalPrice,
      events: [orderEvent],
      tickets: orderTickets,
    },
  });
}

export async function getOrders() {
  return prisma.order.findMany({
    include: {
      paymentAttempts: true,
    },
  });
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      paymentAttempts: true,
    },
  });
}

export async function updateOrder(id: string, dto: UpdateOrderDto) {
  const { status } = dto;

  const data: {
    status?: OrderStatusEnum;
  } = {};

  if (status !== undefined) {
    data.status = status.toUpperCase() as OrderStatusEnum;
  }

  return prisma.order.update({
    where: { id },
    data,
  });
}

export async function deleteOrder(id: string) {
  return prisma.order.delete({
    where: { id },
  });
}

export async function getOrdersByUserId(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: {
      paymentAttempts: true,
    },
  });
}
