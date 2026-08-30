import { Request, Response } from "express";
import {
  createPaymentCheckout,
  processWebhookEvent,
  verifyWebhookSignature,
  processRefund,
  cancelPayment,
  PaymentError,
} from "../service/payment";
import { CreatePaymentCheckoutDto, CreateRefundDto } from "../types/payment";
import type Stripe from "stripe";

// Extended request type that includes the raw body captured before
// express.json() parses the stream.
interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

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
 * This endpoint uses the raw body stream (req.rawBody)
 * for Stripe's HMAC signature verification — never req.body,
 * because express.json() parses and mutates the stream.
 */
const webhookHandler = async (req: RawBodyRequest, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    return res.status(400).json({ error: "Missing Stripe-Signature header" });
  }

  const rawBody = req.rawBody;

  if (!rawBody) {
    return res.status(400).json({ error: "Missing request body" });
  }

  let event: Stripe.Event;
  try {
    event = await verifyWebhookSignature(rawBody, signature);
  } catch (error) {
    if (error instanceof PaymentError) {
      // Don't leak internal error details, Stripe will retry
      return res.status(400).json({ error: "Invalid signature" });
    }
    throw error;
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
