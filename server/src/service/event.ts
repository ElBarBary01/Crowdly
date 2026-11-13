import {
  withAvailability,
  inventoryTransaction,
  lockInventory,
  blockingReservations,
} from "./reservation";
import prisma from "../lib/prisma";
import {
  CreateEventDto,
  type EventTicketInput,
  getTicketsLeft,
  UpdateEventDto,
  GetEventsQuery,
} from "../types/event";
import {
  Genre as GenreEnum,
  TicketType as TicketTypeEnum,
} from "../../generated/prisma/enums";

export class InvalidEventConfigurationError extends Error {}

async function validateTicketConfigurationForVenue(
  venueId: string,
  tickets: readonly EventTicketInput[],
) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: {
      capacity: true,
      stageSections: true,
    },
  });

  if (!venue) {
    throw new InvalidEventConfigurationError("Venue not found");
  }

  const ticketsLeft = getTicketsLeft(tickets);
  if (ticketsLeft > venue.capacity) {
    throw new InvalidEventConfigurationError(
      `Ticket quantity (${ticketsLeft}) cannot exceed venue capacity (${venue.capacity})`,
    );
  }

  const configuredTicketTypes = new Set(tickets.map((ticket) => ticket.type));
  const missingTicketTypes = Array.from(
    new Set(
      venue.stageSections
        .map((section) => section.ticketType)
        .filter((ticketType) => !configuredTicketTypes.has(ticketType)),
    ),
  );

  if (missingTicketTypes.length > 0) {
    throw new InvalidEventConfigurationError(
      `Event tickets are missing categories used by venue sections: ${missingTicketTypes.join(", ")}`,
    );
  }
}

export async function createEvent(dto: CreateEventDto) {
  const { title, date, time, genres, venueId, artistsIds, tickets } = dto;
  await validateTicketConfigurationForVenue(venueId, tickets);

  const event = await prisma.event.create({
    data: {
      title,
      date: new Date(date),
      time,
      genres: genres.map((g) => g.toUpperCase() as unknown as GenreEnum),
      venue: { connect: { id: venueId } },
      artists: {
        create: artistsIds.map((artistId) => ({
          artist: { connect: { id: artistId } },
        })),
      },
      tickets: tickets.map((t) => ({
        type: t.type.toUpperCase() as unknown as TicketTypeEnum,
        price: t.price,
        quantity: t.quantity,
        description: t.description ?? null,
      })),
    },
    include: {
      venue: true,
      artists: { include: { artist: true } },
    },
  });

  return (await withAvailability([event]))[0];
}
export async function getEvents(query: GetEventsQuery = {}) {
  const { sort, order, genre, venueId, page = 1, limit = 6 } = query;

  const skip = (page - 1) * limit;

  const where = {
    ...(genre && {
      genres: {
        has: genre.toUpperCase() as GenreEnum,
      },
    }),

    ...(venueId && {
      venueId,
    }),
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,

      orderBy: sort
        ? {
            [sort]: order || "asc",
          }
        : undefined,

      skip,
      take: limit,

      include: {
        venue: true,
        artists: { include: { artist: true } },
      },
    }),

    prisma.event.count({
      where,
    }),
  ]);

  return {
    events: await withAvailability(events),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUpcomingEvents(limit = 5) {
  const events = await prisma.event.findMany({
    where: {
      date: {
        gte: new Date(),
      },
    },
    orderBy: {
      date: "asc",
    },
    take: limit,
    include: {
      venue: true,
      artists: { include: { artist: true } },
    },
  });
  return withAvailability(events);
}
export async function getTrendingEvents(limit = 4) {
  const events = await prisma.event.findMany({
    where: {
      date: {
        gte: new Date(),
      },
    },
    include: {
      venue: true,
      artists: { include: { artist: true } },
    },
  });

  return (await withAvailability(events))
    .sort((a, b) => {
      if (a.venue.ticketsLeft !== b.venue.ticketsLeft) {
        return a.venue.ticketsLeft - b.venue.ticketsLeft;
      }

      return a.date.getTime() - b.date.getTime();
    })
    .slice(0, limit);
}

export async function getEventById(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      artists: { include: { artist: true } },
    },
  });

  return event ? ((await withAvailability([event]))[0] ?? null) : null;
}

// Update an existing event by ID (partial update with nested relations).

export async function updateEvent(id: string, dto: UpdateEventDto) {
  const { venueId, artistsIds, ...rest } = dto;
  const data: any = {};

  if (venueId !== undefined || dto.tickets !== undefined) {
    const currentEvent = await prisma.event.findUnique({
      where: { id },
      select: {
        venueId: true,
        tickets: true,
      },
    });

    if (!currentEvent) return null;

    await validateTicketConfigurationForVenue(
      venueId ?? currentEvent.venueId,
      dto.tickets ?? currentEvent.tickets,
    );
  }

  // Spread updatable scalar fields
  if (rest.title !== undefined) data.title = rest.title;
  if (rest.date !== undefined) data.date = new Date(rest.date);
  if (rest.time !== undefined) data.time = rest.time;
  if (rest.genres !== undefined)
    data.genres = rest.genres.map(
      (g) => g.toUpperCase() as unknown as GenreEnum,
    );

  // Handle venue relation update
  if (venueId !== undefined) {
    data.venue = { connect: { id: venueId } };
  }

  // Handle artists relation update
  if (artistsIds !== undefined) {
    data.artists = {
      deleteMany: {},
      create: artistsIds.map((artistId) => ({
        artist: { connect: { id: artistId } },
      })),
    };
  }

  // Handle tickets embedded update
  if (dto.tickets !== undefined) {
    data.tickets = dto.tickets.map((t) => ({
      type: t.type.toUpperCase() as unknown as TicketTypeEnum,
      price: t.price,
      quantity: t.quantity,
      description: t.description ?? null,
    }));
  }

  const event = await inventoryTransaction(async (tx) => {
    await lockInventory(tx, [id]);
    if (dto.tickets !== undefined || venueId !== undefined) {
      const reserved = await tx.ticketReservation.count({
        where: {
          eventId: id,
          OR: [blockingReservations(new Date()), { status: "CONSUMED" }],
        },
      });
      const paidOrders = await tx.order.count({
        where: {
          tickets: { some: { eventId: id } },
          paymentStatus: { in: ["SUCCEEDED", "REFUNDED"] },
        },
      });
      if (reserved || paidOrders)
        throw new InvalidEventConfigurationError(
          "Ticket configuration cannot change while tickets are reserved or sold",
        );
    }
    return tx.event.update({
      where: { id },
      data,
      include: {
        venue: true,
        artists: { include: { artist: true } },
      },
    });
  });
  return (await withAvailability([event]))[0];
}

// Delete an event by ID (cascades EventArtist bridge records).

export async function deleteEvent(id: string) {
  return inventoryTransaction(async (tx) => {
    await lockInventory(tx, [id]);
    const orders = await tx.order.count({
      where: { tickets: { some: { eventId: id } } },
    });
    if (orders)
      throw new InvalidEventConfigurationError(
        "Events referenced by orders cannot be deleted",
      );
    await tx.eventArtist.deleteMany({ where: { eventId: id } });
    return tx.event.delete({ where: { id } });
  });
}
export async function getRelatedEvents(id: string) {
  const currentEvent = await prisma.event.findUnique({
    where: { id },
    select: {
      genres: true,
    },
  });

  if (!currentEvent) return null;

  const events = await prisma.event.findMany({
    where: {
      id: { not: id },
      genres: {
        hasSome: currentEvent.genres,
      },
    },
    orderBy: {
      date: "asc",
    },
    take: 4,
    include: {
      venue: true,
      artists: { include: { artist: true } },
    },
  });

  return withAvailability(events);
}
