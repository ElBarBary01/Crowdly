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
router.get("/:id", getOrderByIdHandler);
router.post("/", createOrderHandler);
router.put("/:id", updateOrderHandler);
router.delete("/:id", deleteOrderHandler);
router.get("/user/:userId", getOrdersByUserIdHandler);

export default router;