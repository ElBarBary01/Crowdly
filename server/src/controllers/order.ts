import { Request, Response } from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrdersByUserId,
} from "../service/order";
import { CreateOrderDto } from "../types/order";

const getOrdersHandler = async (_req: Request, res: Response) => {
  try {
    const orders = await getOrders();
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

const getOrderByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Order ID is required" });
    }
    const order = await getOrderById(id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
};

const createOrderHandler = async (req: Request, res: Response) => {
  try {
    const dto: CreateOrderDto = req.body;

    // Validate required fields
    if (!dto.userId) {
      return res
        .status(400)
        .json({ success: false, message: "userId is required" });
    }

    if (!dto.eventId) {
      return res.status(400).json({
        success: false,
        message: "eventId is required",
      });
    }

    if (
      !dto.tickets ||
      !Array.isArray(dto.tickets) ||
      dto.tickets.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "tickets array is required and must not be empty",
      });
    }

    const order = await createOrder(dto);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error("Error creating order:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create order";

    return res.status(400).json({
      success: false,
      message,
    });
  }
};

const updateOrderHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Order ID is required" });
    }

    const order = await updateOrder(id, req.body);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ success: false, message: "Failed to update order" });
  }
};

const deleteOrderHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (typeof id !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid Order ID is required" });
    }
    const order = await deleteOrder(id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ success: false, message: "Failed to delete order" });
  }
};

const getOrdersByUserIdHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (typeof userId !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Valid User ID is required" });
    }
    const orders = await getOrdersByUserId(userId);
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error("Error fetching orders by user:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

export {
  getOrdersHandler,
  getOrderByIdHandler,
  createOrderHandler,
  updateOrderHandler,
  deleteOrderHandler,
  getOrdersByUserIdHandler,
};
