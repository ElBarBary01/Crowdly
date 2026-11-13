import { reconcileOrderPayment } from "../service/payment";
import { getOrderById } from "../service/order";
import { orderView } from "./order";
import { quoteOrder } from "../service/pricing";
import { Request, Response } from "express";
import {
  createPaymentCheckout,
  processWebhookEvent,
  verifyWebhookSignature,
  processRefund,
  cancelPayment,
  PaymentError,
  WebhookSignatureError,
} from "../service/payment";
import { CreatePaymentCheckoutDto, CreateRefundDto } from "../types/payment";
import type Stripe from "stripe";

// POST /payments/create

/**
 * Start the payment flow for an order.
 *
 * Frontend sends:
 *   - orderId: string: the order to pay
 *   - method?: string: optional payment method hint
 *
 * Returns:
 *   - paymentIntentId: Stripe PI ID
 *   - clientSecret: for the frontend Stripe SDK
 *   - paymentAttemptId: our DB reference
 *   - amount: the total amount to charge
 */
const createPaymentHandler = async (req: Request, res: Response) => {
  try {
    const dto: CreatePaymentCheckoutDto = req.body;

    if (!dto.orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    const result = await createPaymentCheckout(dto);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Error creating payment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create payment",
    });
  }
};

// POST /payments/webhook

/**
 * Stripe webhook endpoint.
 *
 * Stripe sends events here (payment_intent.succeeded, etc.).
 * We verify the signature using the raw body, decode the event,
 * and process it.
 *
 * express.raw() supplies req.body as a Buffer on this route, before
 * the application's express.json() middleware can consume the body.
 */
const webhookHandler = async (req: Request, res: Response) => {
  const signature = req.get("stripe-signature");

  if (!signature) {
    return res.status(400).json({ error: "Missing Stripe-Signature header" });
  }

  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    return res
      .status(400)
      .json({ error: "A raw JSON request body is required" });
  }

  let event: Stripe.Event;
  try {
    event = await verifyWebhookSignature(rawBody, signature);
  } catch (error) {
    if (error instanceof WebhookSignatureError) {
      return res.status(400).json({ error: "Invalid signature" });
    }
    console.error("Error verifying webhook:", error);
    return res.status(500).json({ error: "Webhook verification unavailable" });
  }

  try {
    await processWebhookEvent(event);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    // Return 400/500, Stripe will retry with exponential backoff
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

// POST /payments/refund

/**
 * Process a refund for a payment attempt.
 *
 * Expected from auth middleware user context:
 *   - The requester should be an admin.
 *
 * Body:
 *   - paymentAttemptId: string
 *   - amount?: number — optional partial refund amount
 */
const refundHandler = async (req: Request, res: Response) => {
  try {
    const dto: CreateRefundDto = req.body;

    if (!dto.paymentAttemptId) {
      return res.status(400).json({
        success: false,
        message: "paymentAttemptId is required",
      });
    }

    const result = await processRefund(dto);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      error.message === "Payment attempt not found"
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Error processing refund:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process refund",
    });
  }
};

// POST /payments/cancel

/**
 * Cancel an ongoing payment (buyer-initiated).
 *
 * Body:
 *   - orderId: string
 */
const cancelPaymentHandler = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required",
      });
    }

    await cancelPayment(orderId);

    return res.status(200).json({
      success: true,
      message: "Payment cancelled",
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Error cancelling payment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel payment",
    });
  }
};

export {
  createPaymentHandler,
  webhookHandler,
  refundHandler,
  cancelPaymentHandler,
};

export async function paymentStatusHandler(req: Request, res: Response) {
  try {
    await reconcileOrderPayment(req.body.orderId);
    const order = await getOrderById(req.body.orderId);
    return res.json({ success: true, data: orderView(order!) });
  } catch (error) {
    console.error(
      "Payment confirmation deferred",
      error instanceof Error ? error.message : "Unknown failure",
    );
    return res
      .status(503)
      .json({
        success: false,
        message:
          "We could not verify payment yet. Your reservation remains protected while we retry.",
      });
  }
}
export async function quoteHandler(req: Request, res: Response) {
  try {
    return res.json({ success: true, data: await quoteOrder(req.body) });
  } catch (error) {
    return res.status(400).json({
      message: error instanceof Error ? error.message : "Invalid cart",
    });
  }
}
