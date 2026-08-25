import prisma from "../lib/prisma";
import { getTicketsLeft } from "../types/event";
import { CreateVenueDto, UpdateVenueDto } from "../types/venue";

export class InvalidVenueConfigurationError extends Error {}

export async function createVenue(dto: CreateVenueDto) {
  const {
    name,
    stageType,
    stageSections,
    description,
    capacity,
    location,
    images,
    amenities,
    policies,
    seatingChartImage,
  } = dto;
  return prisma.venue.create({
    data: {
      name,
      stageType,
      stageSections: stageSections.map((section) => ({
        ...section,
        level: section.level ?? null,
      })),
      description,
      capacity,
      location,
      images,
      amenities,
      policies,
      seatingChartImage,
    },
  });
}

export async function getVenues() {
  return prisma.venue.findMany();
}

export async function getVenueById(id: string) {
  return prisma.venue.findUnique({
    where: { id },
  });
}

export async function updateVenue(id: string, dto: UpdateVenueDto) {
  if (dto.capacity !== undefined || dto.stageSections !== undefined) {
    const currentVenue = await prisma.venue.findUnique({
      where: { id },
      include: {
        events: {
          select: { id: true, tickets: true },
        },
      },
    });

    if (!currentVenue) return null;

    const capacity = dto.capacity ?? currentVenue.capacity;
    const stageSections = dto.stageSections ?? currentVenue.stageSections;
    const sectionTicketTypes = new Set(
      stageSections.map((section) => section.ticketType),
    );

    for (const event of currentVenue.events) {
      const ticketsLeft = getTicketsLeft(event.tickets);
      if (ticketsLeft > capacity) {
        throw new InvalidVenueConfigurationError(
          `Venue capacity cannot be lower than the ${ticketsLeft} tickets remaining for event ${event.id}`,
        );
      }

      const eventTicketTypes = new Set(
        event.tickets.map((ticket) => ticket.type),
      );
      const missingTicketTypes = Array.from(sectionTicketTypes).filter(
        (ticketType) => !eventTicketTypes.has(ticketType),
      );
      if (missingTicketTypes.length > 0) {
        throw new InvalidVenueConfigurationError(
          `Venue sections use ticket categories missing from event ${event.id}: ${missingTicketTypes.join(", ")}`,
        );
      }
    }
  }

  return prisma.venue.update({
    where: { id },
    data: {
      ...dto,
      stageSections: dto.stageSections?.map((section) => ({
        ...section,
        level: section.level ?? null,
      })),
    },
  });
}

export async function deleteVenue(id: string) {
  return prisma.venue.delete({
    where: { id },
  });
}
