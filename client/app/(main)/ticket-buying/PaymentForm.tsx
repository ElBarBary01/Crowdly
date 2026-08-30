"use client";

import { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import Button from "../../components/ui/Button";

interface PaymentFormProps {
  orderId: string | null;
  checkoutTotal: number;
  isProcessing: boolean;
  onSuccess: () => void;
  onError: (error: string) => void;
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
      // Step 1: Create payment intent on backend
      console.log("Creating payment for orderId:", orderId);
      const paymentResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orderId }),
        },
      );

      console.log("Payment creation response status:", paymentResponse.status);
      const paymentData = await paymentResponse.json();
      console.log("Payment creation response:", paymentData);

      if (!paymentResponse.ok) {
        throw new Error(paymentData.message || "Failed to create payment");
      }

      const { clientSecret } = paymentData.data;

      // Step 2: Confirm payment with Stripe using Elements
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
        console.log("✓ Payment succeeded");
        onSuccess();
      } else {
        throw new Error("Payment not completed");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Payment processing failed";
      console.error("Payment error:", message);
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "#424242",
      },
      invalid: {
        color: "#c23030",
      },
    },
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          marginBottom: "1rem",
        }}
      >
        <CardElement options={cardElementOptions} />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || isProcessing || !stripe || !elements}
      >
        {isSubmitting || isProcessing
          ? "Processing..."
          : `Pay $${checkoutTotal.toFixed(2)}`}
      </Button>
    </form>
  );
}
