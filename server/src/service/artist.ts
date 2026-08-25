import prisma from "../lib/prisma";
import { CreateArtistDto, UpdateArtistDto } from "../types/artist";

export async function createArtist(dto: CreateArtistDto) {
  const { name, genres, images } = dto;
  return prisma.artist.create({
    data: { name, genres, images },
  });
}

export async function getArtists() {
  return prisma.artist.findMany();
}

export async function getArtistById(id: string) {
  return prisma.artist.findUnique({
    where: { id },
  });
}

export async function updateArtist(id: string, dto: UpdateArtistDto) {
  return prisma.artist.update({
    where: { id },
    data: dto,
  });
}

export async function deleteArtist(id: string) {
  return prisma.artist.delete({
    where: { id },
  });
}
