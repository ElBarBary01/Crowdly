import { Router } from "express";
import {
  createPaymentHandler,
  webhookHandler,
  refundHandler,
  cancelPaymentHandler,
} from "../controllers/payment.controller";

const router = Router();

// Payment endpoints (require parsed body from express.json)
router.post("/create", createPaymentHandler);
router.post("/refund", refundHandler);
router.post("/cancel", cancelPaymentHandler);

// Webhook endpoint, uses raw body from the captureRawBody middleware
// registered in index.ts BEFORE express.json().  Stripe signature
// verification requires the raw body stream.
router.post("/webhook", webhookHandler);

export default router;
