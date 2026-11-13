import { requireOrderOwner } from "../middleware/auth.middleware";
import express from "express";
import {
  getOrdersHandler,
  getOrderByIdHandler,
  createOrderHandler,
  updateOrderHandler,
  deleteOrderHandler,
  getOrdersByUserIdHandler,
} from "../controllers/order";

const router = express.Router();

router.get("/", getOrdersHandler);
router.get("/:id", requireOrderOwner, getOrderByIdHandler);
router.post("/", createOrderHandler);
router.get("/user/:userId", getOrdersByUserIdHandler);
router.put("/:id", requireOrderOwner, updateOrderHandler);
router.delete("/:id", requireOrderOwner, deleteOrderHandler);

export default router;
