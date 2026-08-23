import prisma from "./prisma";
import { CreateVenueDto, UpdateVenueDto } from "../types/venue";

export async function createVenue(dto: CreateVenueDto) {
  const {
    name,
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
  return prisma.venue.update({
    where: { id },
    data: dto,
  });
}

export async function deleteVenue(id: string) {
  return prisma.venue.delete({
    where: { id },
  });
}
