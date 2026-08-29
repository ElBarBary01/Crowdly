import prisma from "../lib/prisma";
import { Genre, GENRE_METADATA } from "../types/genre";
import type { Ticket } from "../../generated/prisma/client";

const FEW_LEFT_THRESHOLD = 50;

function getAvailabilityLabel(
  tickets: Ticket[],
): "Few Left" | "Sold Out" | null {
  const totalQuantity = tickets.reduce((sum, t) => sum + t.quantity, 0);
  const totalSold = tickets.reduce((sum, t) => sum + ((t as any).sold ?? 0), 0);
  const remaining = totalQuantity - totalSold;

  if (remaining <= 0) return "Sold Out";
  if (remaining <= FEW_LEFT_THRESHOLD) return "Few Left";
  return null;
}

function toEventCard(event: any) {
  const primaryGenre = event.genres[0] as Genre | undefined;

  return {
    id: event.id,
    title: event.title,
    date: event.date,
    time: event.time,
    image: event.images[0] ?? null,
    venue: {
      name: event.venue.name,
      location: event.venue.location,
    },
    genreLabel: primaryGenre ? GENRE_METADATA[primaryGenre].label : null,
    availabilityLabel: getAvailabilityLabel(event.tickets),
    fromPrice: event.tickets.length
      ? Math.min(...event.tickets.map((t: any) => t.price))
      : null,
  };
}

export async function getFeaturedArtists(limit = 6) {
  const artists = await prisma.artist.findMany({
    take: limit,
    select: { id: true, name: true, genres: true, images: true },
  });

  return artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    genreLabel: artist.genres[0]
      ? (GENRE_METADATA[artist.genres[0] as Genre]?.label ?? artist.genres[0])
      : null,
    image: artist.images[0] ?? null,
  }));
}

export async function getTrendingEvents(limit = 3) {
  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
    take: limit,
    include: { venue: true, tickets: true },
  });

  return events.map(toEventCard);
}

export async function getNearByEvents(limit = 3, city?: string) {
  const events = await prisma.event.findMany({
    where: {
      date: { gte: new Date() },
      ...(city && {
        venue: { location: { contains: city, mode: "insensitive" } },
      }),
    },
    orderBy: { date: "asc" },
    take: limit,
    include: { venue: true, tickets: true },
  });

  return events.map(toEventCard);
}

export async function getGenreCounts() {
  const counts = await Promise.all(
    Object.values(Genre).map(async (genre) => ({
      genre,
      ...GENRE_METADATA[genre],
      count: await prisma.event.count({ where: { genres: { has: genre } } }),
    })),
  );
  return counts;
}
