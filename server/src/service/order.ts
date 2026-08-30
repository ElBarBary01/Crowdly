import prisma from "../lib/prisma";
import { CreateOrderDto, UpdateOrderDto } from "../types/order";
import {
  TicketType as TicketTypeEnum,
  OrderStatus as OrderStatusEnum,
} from "../../generated/prisma/enums";

export async function createOrder(dto: CreateOrderDto) {
  const { userId, tickets } = dto;

  if (!tickets || tickets.length === 0) {
    throw new Error("At least one ticket is required");
  }

  // Collect all unique eventIds from the ticket line items
  const eventIds = Array.from(new Set(tickets.map((t) => t.eventId)));

  if (eventIds.length === 0) {
    throw new Error("At least one eventId is required");
  }

  // Fetch all events (and their venues) in a single query
  const events = await prisma.event.findMany({
    where: { id: { in: eventIds } },
    include: {
      venue: true,
    },
  });

  if (events.length !== eventIds.length) {
    const missingIds = eventIds.filter(
      (id) => !events.find((e) => e.id === id),
    );
    throw new Error(
      `Events not found: ${missingIds.join(", ")}`,
    );
  }

  // Validate no past events
  for (const event of events) {
    if (event.date < new Date()) {
      throw new Error(
        `Cannot create an order for a past event: ${event.title}`,
      );
    }
  }

  // Build OrderTicket and OrderEvent snapshots
  // Group tickets by eventId so we can match them with the right event snapshot
  const ticketsByEvent = new Map<string, typeof tickets>();
  for (const eventId of eventIds) {
    ticketsByEvent.set(
      eventId,
      tickets.filter((t) => t.eventId === eventId),
    );
  }

  const orderTickets: {
    eventId: string;
    type: TicketTypeEnum;
    price: number;
    quantity: number;
  }[] = [];
  const orderEvents: {
    id: string;
    title: string;
    date: Date;
    time: string;
    venueId: string;
    venueName: string;
  }[] = [];

  let subtotal = 0;

  for (const event of events) {
    const grouped = ticketsByEvent.get(event.id);
    if (!grouped) continue;

    // Add event snapshot
    orderEvents.push({
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      venueId: event.venueId,
      venueName: event.venue.name,
    });

    // Build ticket line items for this event
    for (const requestedTicket of grouped) {
      const ticketType = requestedTicket.type.toUpperCase() as TicketTypeEnum;

      const eventTicket = event.tickets.find(
        (ticket) => ticket.type === ticketType,
      );

      if (!eventTicket) {
        throw new Error(
          `Ticket type ${requestedTicket.type} is not available for event ${event.title}`,
        );
      }
      if (requestedTicket.quantity <= 0) {
        throw new Error("Ticket quantity must be greater than zero");
      }
      if (requestedTicket.quantity > eventTicket.quantity) {
        throw new Error(
          `Not enough ${requestedTicket.type} tickets available for event ${event.title}`,
        );
      }

      orderTickets.push({
        eventId: event.id,
        type: ticketType,
        price: eventTicket.price,
        quantity: requestedTicket.quantity,
      });

      subtotal += eventTicket.price * requestedTicket.quantity;
    }
  }

  const serviceFee = dto.serviceFee ?? 0;
  const totalPrice = subtotal + serviceFee;

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
      events: orderEvents,
      tickets: orderTickets,
    },
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
      payments: true,
    },
  });
}
