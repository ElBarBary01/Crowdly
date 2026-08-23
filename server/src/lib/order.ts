import prisma from "../lib/prisma";
import { CreateOrderDto, UpdateOrderDto } from "../types/order";

export async function createOrder(dto: CreateOrderDto) {
  const { userId, serviceFee, totalPrice, events, tickets } = dto;
  return prisma.order.create({
    data: {
      userId,
      serviceFee,
      totalPrice,
      events: { create: events },
      tickets: { create: tickets },
    },
  });
}

export async function getOrders() {
  return prisma.order.findMany();
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
  });
}

export async function updateOrder(id: string, dto: UpdateOrderDto) {
  return prisma.order.update({
    where: { id },
    data: dto,
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
  });
}
