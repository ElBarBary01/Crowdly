import prisma from "../lib/prisma";
import { CreateEventDto, UpdateEventDto } from "../types/event";
import { Genre as GenreEnum, TicketType as TicketTypeEnum } from "../../generated/prisma/enums";

export async function createEvent(dto: CreateEventDto) {
  const { title, date, time, genres, venueId, artistsIds, tickets } = dto;
  return prisma.event.create({
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
      })),
    },
    include: {
      venue: true,
      artists: { include: { artist: true } },
    },
  });
}

export async function getEvents() {
  return prisma.event.findMany({
    include: {
      venue: true,
      artists: { include: { artist: true } },
    },
  });
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      venue: true,
      artists: { include: { artist: true } },
    },
  });
}

// Update an existing event by ID (partial update with nested relations).

export async function updateEvent(id: string, dto: UpdateEventDto) {
  const { venueId, artistsIds, ...rest } = dto;
  const data: any = {};

  // Spread updatable scalar fields
  if (rest.title !== undefined) data.title = rest.title;
  if (rest.date !== undefined) data.date = new Date(rest.date);
  if (rest.time !== undefined) data.time = rest.time;
  if (rest.genres !== undefined) data.genres = rest.genres.map((g) => g.toUpperCase() as unknown as GenreEnum);

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
    }));
  }

  return prisma.event.update({
    where: { id },
    data,
    include: {
      venue: true,
      artists: { include: { artist: true } },
    },
  });
}

// Delete an event by ID (cascades EventArtist bridge records).

export async function deleteEvent(id: string) {
  const [, event] = await prisma.$transaction([
    prisma.eventArtist.deleteMany({
      where: { eventId: id },
    }),
    prisma.event.delete({
      where: { id },
    }),
  ]);
  return event;
}