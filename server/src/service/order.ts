import prisma from "../lib/prisma";
import { CreateOrderDto, UpdateOrderDto } from "../types/order";
import { TicketType as TicketTypeEnum } from "../../generated/prisma/enums";

export async function createOrder(dto: CreateOrderDto) {
  const { userId, serviceFee, totalPrice, events, tickets } = dto;
  return prisma.order.create({
    data: {
      user: { connect: { id: userId } },
      serviceFee,
      totalPrice,
      events: events.map((e) => ({ ...e, date: new Date(e.date) })),
      tickets: tickets.map((t) => ({
        type: t.type.toUpperCase() as unknown as TicketTypeEnum,
        price: t.price,
        quantity: t.quantity,
      })),
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
  const { status, ...rest } = dto;
  const data: any = { ...rest };
  if (status !== undefined) {
    data.status = status.toUpperCase() as any;
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
  });
}