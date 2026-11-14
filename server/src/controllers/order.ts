import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import {
  createOrder,
  getOrderById,
  deleteOrder,
  getOrdersByUserId,
} from "../service/order";
import { ReservationError } from "../service/reservation";
import type { Order } from "../../generated/prisma/client";
import { moneyAmount } from "../service/pricing";
export function orderView<T extends Order>(order: T) {
  const serverNow = new Date();
  const confirmed =
    order.status === "CONFIRMATION" &&
    ["SUCCEEDED", "PARTIALLY_REFUNDED"].includes(order.paymentStatus) &&
    !order.ticketsCancelledAt;
  const expired =
    order.status === "EXPIRED" ||
    (order.status === "TICKET_SELECTION" &&
      Boolean(order.expiresAt && order.expiresAt <= serverNow));
  return {
    ...order,
    subtotalAmount:
      order.subtotalAmount ??
      order.tickets.reduce(
        (sum, ticket) => sum + moneyAmount(ticket.price) * ticket.quantity,
        0,
      ),
    addOnAmount: order.addOnAmount ?? 0,
    feeAmount: order.feeAmount ?? moneyAmount(order.serviceFee),
    discountAmount: order.discountAmount ?? 0,
    totalAmount: order.totalAmount ?? moneyAmount(order.totalPrice),
    serverNow,
    confirmed,
    expired,
    ticketsValid: confirmed,
  };
}
function fail(res: Response, error: unknown) {
  if (error instanceof ReservationError)
    return res.status(409).json({ success: false, message: error.message });
  console.error(
    "Order operation failed",
    error instanceof Error ? error.message : "Unknown failure",
  );
  return res
    .status(500)
    .json({ success: false, message: "Order operation failed" });
}
export async function getOrdersHandler(req: AuthRequest, res: Response) {
  try {
    const orders = await getOrdersByUserId(req.user!.userId);
    return res.json({ success: true, data: orders.map(orderView) });
  } catch (error) {
    return fail(res, error);
  }
}
export async function getOrderByIdHandler(req: AuthRequest, res: Response) {
  try {
    const order = await getOrderById(req.params.id as string);
    return order
      ? res.json({ success: true, data: orderView(order) })
      : res.status(404).json({ message: "Order not found" });
  } catch (error) {
    return fail(res, error);
  }
}
export async function createOrderHandler(req: AuthRequest, res: Response) {
  try {
    if (typeof req.body?.requestId !== "string")
      return res
        .status(400)
        .json({ message: "A stable checkout request ID is required" });
    const order = await createOrder({ ...req.body, userId: req.user!.userId });
    return res.status(201).json({ success: true, data: orderView(order) });
  } catch (error) {
    return res
      .status(400)
      .json({
        success: false,
        message: error instanceof Error ? error.message : "Invalid order",
      });
  }
}
export function updateOrderHandler(_req: AuthRequest, res: Response) {
  return res
    .status(405)
    .json({ message: "Use checkout or cancellation to change an order" });
}
export async function deleteOrderHandler(req: AuthRequest, res: Response) {
  try {
    await deleteOrder(req.params.id as string);
    return res.json({ success: true });
  } catch (error) {
    return fail(res, error);
  }
}
export async function getOrdersByUserIdHandler(
  req: AuthRequest,
  res: Response,
) {
  if (req.params.userId !== req.user!.userId)
    return res.status(403).json({ message: "Order access denied" });
  return getOrdersHandler(req, res);
}
