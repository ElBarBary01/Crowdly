import { TicketType as TicketTypeEnum } from "../../generated/prisma/enums";
import { ReservationError } from "./reservation";
import prisma from "../lib/prisma";
export const ADD_ONS = [
  {
    id: "parking",
    name: "Parking Pass",
    description: "Reserved parking at the venue",
    amount: 3500,
  },
  {
    id: "merch",
    name: "Merch Bundle",
    description: "T-shirt + poster + digital download",
    amount: 5500,
  },
  {
    id: "lounge",
    name: "VIP Lounge Upgrade",
    description: "Exclusive lounge access + open bar",
    amount: 8000,
  },
] as const;

export function moneyAmount(value: number): number {
  const cents = Math.round(value * 100);
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(value * 100 - cents) > 0.00001 ||
    cents > 99_999_999
  ) {
    throw new Error(
      "Amount must be a non-negative USD amount with at most two decimal places",
    );
  }
  return cents;
}

export function priceOrder(
  tickets: { price: number; quantity: number }[],
  addOns: unknown = [],
  promoCode?: unknown,
) {
  if (
    !Array.isArray(addOns) ||
    addOns.some(
      (id) => typeof id !== "string" || !ADD_ONS.some((item) => item.id === id),
    )
  )
    throw new Error("Invalid add-ons");
  const selected = [...new Set(addOns as string[])].sort();
  const code =
    typeof promoCode === "string" ? promoCode.trim().toUpperCase() : "";
  if (promoCode !== undefined && typeof promoCode !== "string")
    throw new Error("Invalid promo code");
  if (code && code !== "STAGEFRONT10")
    throw new Error("Promo code is not valid");
  const subtotalAmount = tickets.reduce(
    (sum, ticket) => sum + moneyAmount(ticket.price) * ticket.quantity,
    0,
  );
  const addOnAmount = ADD_ONS.filter((item) =>
    selected.includes(item.id),
  ).reduce((sum, item) => sum + item.amount, 0);
  const base = subtotalAmount + addOnAmount;
  const feeAmount = Math.round((base * 15) / 100);
  const discountAmount = code ? Math.round((base * 10) / 100) : 0;
  const totalAmount = base + feeAmount - discountAmount;
  if (
    !Number.isSafeInteger(totalAmount) ||
    totalAmount <= 0 ||
    totalAmount > 99_999_999
  )
    throw new Error("Order amount is outside the supported range");
  return {
    subtotalAmount,
    addOnAmount,
    feeAmount,
    discountAmount,
    totalAmount,
    currency: "usd",
    addOns: selected,
    promoCode: code || null,
    serviceFee: feeAmount / 100,
    totalPrice: totalAmount / 100,
  };
}

export function normalizeTickets(
  tickets: { eventId: string; type: string; quantity: number }[],
) {
  if (!Array.isArray(tickets) || tickets.length === 0)
    throw new ReservationError("At least one ticket is required");
  const lines = new Map<
    string,
    { eventId: string; type: TicketTypeEnum; quantity: number }
  >();
  for (const ticket of tickets) {
    if (
      !ticket ||
      typeof ticket.eventId !== "string" ||
      !ticket.eventId ||
      typeof ticket.type !== "string" ||
      !Number.isSafeInteger(ticket.quantity) ||
      ticket.quantity <= 0
    )
      throw new ReservationError(
        "Tickets require an event, category, and positive integer quantity",
      );
    const type = ticket.type.toUpperCase() as TicketTypeEnum;
    if (!Object.values(TicketTypeEnum).includes(type))
      throw new ReservationError("Invalid ticket category");
    const key = ticket.eventId + ":" + type;
    const quantity = (lines.get(key)?.quantity ?? 0) + ticket.quantity;
    if (!Number.isSafeInteger(quantity))
      throw new ReservationError("Ticket quantity is too large");
    lines.set(key, { eventId: ticket.eventId, type, quantity });
  }
  return lines;
}
export async function quoteOrder(dto: {
  tickets: { eventId: string; type: string; quantity: number }[];
  addOns?: string[];
  promoCode?: string;
}) {
  const lines = normalizeTickets(dto.tickets);
  const events = await prisma.event.findMany({
    where: {
      id: { in: [...new Set([...lines.values()].map((line) => line.eventId))] },
    },
  });
  const tickets = [...lines.values()].map((line) => {
    const event = events.find((event) => event.id === line.eventId);
    const ticket = event?.tickets.find((ticket) => ticket.type === line.type);
    if (!event || !ticket || event.date <= new Date())
      throw new ReservationError("Event or ticket category is not available");
    return { ...line, price: ticket.price };
  });
  return {
    ...priceOrder(tickets, dto.addOns, dto.promoCode),
    tickets,
    serverNow: new Date(),
  };
}
