"use client";

import { useEffect, useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import type { StripeCardElementOptions } from "@stripe/stripe-js";
import Button from "../../components/ui/Button";

interface PaymentFormProps {
  orderId: string | null;
  checkoutTotal: number;
  isProcessing: boolean;
  onSuccess: () => void;
  onError: (error: string) => void;
}

function readCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

export default function PaymentForm({
  orderId,
  checkoutTotal,
  isProcessing,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardElementOptions, setCardElementOptions] =
    useState<StripeCardElementOptions | null>(null);

  useEffect(() => {
    // Pull actual theme colors so the Stripe iframe matches your CSS vars
    const textColor = readCssVar("--color-text", "#e5e5e5");
    const dimColor = readCssVar("--color-dim", "#8a8a8a");
    const errorColor = readCssVar("--color-error", "#c23030");
    const fontSans = readCssVar("--font-sans", "sans-serif");

    setCardElementOptions({
      style: {
        base: {
          color: textColor,
          fontSize: "14px",
          lineHeight: "20px",
          fontFamily: fontSans,
          "::placeholder": {
            color: dimColor,
          },
        },
        invalid: {
          color: errorColor,
          iconColor: errorColor,
        },
      },
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError("Stripe not loaded");
      return;
    }

    if (!orderId) {
      onError("Order not created yet");
      return;
    }

    setIsSubmitting(true);

    try {
      const paymentResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orderId }),
        },
      );

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentData.message || "Failed to create payment");
      }

      const { clientSecret } = paymentData.data;

      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: "Customer",
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Payment failed");
      }

      if (result.paymentIntent?.status === "succeeded") {
        onSuccess();
      } else {
        throw new Error("Payment not completed");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Payment processing failed";
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="ticket-buying__stripe-field">
        <label className="input-field__label">Card Details</label>
        <div className="ticket-buying__stripe-input">
          {cardElementOptions && <CardElement options={cardElementOptions} />}
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="ticket-buying__primary-action"
        disabled={isSubmitting || isProcessing || !stripe || !elements}
      >
        {isSubmitting || isProcessing
          ? "Processing..."
          : `Pay $${checkoutTotal.toFixed(2)}`}
      </Button>
    </form>
  );
}
