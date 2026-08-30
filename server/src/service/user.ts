import prisma from "../lib/prisma";
import { CreateUserDto, UpdateUserDto } from "../types/user";

export async function createUser(dto: CreateUserDto) {
  const { name, email, password, profileImage, phone, address } = dto;
  return prisma.user.create({
    data: { name, email, password, profileImage, phone, address },
  });
}

export async function getUsers() {
  return prisma.user.findMany();
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function updateUser(id: string, dto: UpdateUserDto) {
  return prisma.user.update({
    where: { id },
    data: dto,
  });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({
    where: { id },
  });
}
