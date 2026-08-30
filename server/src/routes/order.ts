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
router.get("/user/:userId", getOrdersByUserIdHandler);
router.put("/:id", updateOrderHandler);
router.delete("/:id", deleteOrderHandler);

export default router;
