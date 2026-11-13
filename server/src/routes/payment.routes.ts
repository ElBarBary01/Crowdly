import { Router } from "express";
import {
  createPaymentHandler,
  refundHandler,
  cancelPaymentHandler,
} from "../controllers/payment.controller";

const router = Router();

// Payment endpoints (require parsed body from express.json)
router.post("/create", createPaymentHandler);
router.post("/refund", refundHandler);
router.post("/cancel", cancelPaymentHandler);

export default router;
