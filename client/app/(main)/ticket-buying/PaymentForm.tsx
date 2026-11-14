"use client";

import { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import type { StripeCardElementOptions } from "@stripe/stripe-js";
import Button from "../../components/ui/Button";

interface PaymentFormProps {
  orderId: string | null;
  checkoutTotal: number;
  isProcessing: boolean;
  onSuccess: () => void;
  onProcessing: () => void;
  disabled: boolean;
  billingName: string;
  onError: (error: string) => void;
}

const cardElementOptions: StripeCardElementOptions = {
  style: {
    base: {
      color: "#e5e5e5",
      fontSize: "14px",
      "::placeholder": { color: "#8a8a8a" },
    },
    invalid: { color: "#c23030" },
  },
};

export default function PaymentForm({
  orderId,
  checkoutTotal,
  isProcessing,
  onSuccess,
  onProcessing,
  disabled,
  billingName,
  onError,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (disabled || isProcessing || isSubmitting) return;
    if (!stripe || !elements) {
      onError("Stripe not loaded");
      return;
    }

    if (!orderId) {
      onError("Order not created yet");
      return;
    }

    setIsSubmitting(true);
    onProcessing();

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

      const { clientSecret, status, amountMinor } = paymentData.data;
      if (status === "SUCCEEDED" || status === "PARTIALLY_REFUNDED") {
        onSuccess();
        return;
      }
      if (!clientSecret || amountMinor !== Math.round(checkoutTotal * 100))
        throw new Error(
          "Order pricing changed. Reload your reservation before paying.",
        );

      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: billingName,
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Payment failed");
      }

      if (
        ["succeeded", "processing"].includes(result.paymentIntent?.status ?? "")
      ) {
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
        disabled={
          disabled || isSubmitting || isProcessing || !stripe || !elements
        }
      >
        {isSubmitting || isProcessing
          ? "Processing..."
          : `Pay $${checkoutTotal.toFixed(2)}`}
      </Button>
    </form>
  );
}
