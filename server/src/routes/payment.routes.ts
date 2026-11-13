import { Router } from "express";
import {
  createPaymentHandler,
  refundHandler,
  cancelPaymentHandler,
  paymentStatusHandler,
  quoteHandler,
} from "../controllers/payment.controller";
import {
  requireAuth,
  requireOrderOwner,
  requireAdmin,
} from "../middleware/auth.middleware";
import { ADD_ONS } from "../service/pricing";
const router = Router();
router.get("/pricing", (_req, res) =>
  res.json({ currency: "usd", addOns: ADD_ONS, feePercent: 15 }),
);
router.post("/quote", quoteHandler);
router.use(requireAuth);
router.post("/create", requireOrderOwner, createPaymentHandler);
router.post("/status", requireOrderOwner, paymentStatusHandler);
router.post("/cancel", requireOrderOwner, cancelPaymentHandler);
router.post("/refund", requireAdmin, refundHandler);
export default router;
