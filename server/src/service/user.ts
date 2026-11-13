import prisma from "../lib/prisma";
import { CreateUserDto, UpdateUserDto } from "../types/user";

const publicUser = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  profileImage: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createUser(dto: CreateUserDto) {
  const { name, email, password, profileImage, phone, address } = dto;
  return prisma.user.create({
    data: { name, email, password, profileImage, phone, address },
    select: publicUser,
  });
}

export async function getUsers() {
  return prisma.user.findMany({ select: publicUser });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: publicUser,
  });
}

export async function updateUser(id: string, dto: UpdateUserDto) {
  return prisma.user.update({
    where: { id },
    data: {
      name: dto.name,
      phone: dto.phone,
      address: dto.address,
      profileImage: dto.profileImage,
    },
  });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({
    where: { id },
  });
}
