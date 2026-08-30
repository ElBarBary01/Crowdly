"use client";

import { useEffect, useState } from "react";
import { loadStripe, Stripe as StripeLib } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import Button from "../../components/ui/Button";
import Checkbox from "../../components/ui/Checkbox/Checkbox";
import InputField from "../../components/ui/InputField";
import ProgressStepper from "../../components/ui/feedbackComponents/progressStepper";
import PaymentForm from "./PaymentForm";
import "./TicketBuying.css";
import { useRouter, useSearchParams } from "next/navigation";

// Initialize Stripe promise outside component
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
);

type CheckoutState = "tickets" | "account" | "payment" | "confirmation";
type AddOnId = "parking" | "merch" | "lounge";

type AddOn = {
  id: AddOnId;
  name: string;
  description: string;
  price: number;
};
type Ticket = {
  type: string;
  price: number;
  quantity: number;
  description: string | null;
};

type EventData = {
  title: string;
  date: string;
  images: string[];
  tickets: Ticket[];
  venue: {
    name: string;
  };
};
type OrderSummaryProps = {
  total: number;
  showPromo: boolean;
  promoCode: string;
  promoApplied: boolean;
  ticketName: string;
  quantity: number;
  eventTitle: string;
  eventDate: string;
  eventImage: string;
  onPromoCodeChange: (value: string) => void;
  onApplyPromo: () => void;
};

const checkoutSteps = [
  { id: "tickets", label: "Ticket Selection" },
  { id: "account", label: "Account Info" },
  { id: "payment", label: "Payment" },
  { id: "confirmation", label: "Confirmation" },
] as const;

const addOns: readonly AddOn[] = [
  {
    id: "parking",
    name: "Parking Pass",
    description: "Reserved parking at the venue",
    price: 35,
  },
  {
    id: "merch",
    name: "Merch Bundle",
    description: "T-shirt + poster + digital download",
    price: 55,
  },
  {
    id: "lounge",
    name: "VIP Lounge Upgrade",
    description: "Exclusive lounge access + open bar",
    price: 80,
  },
];

const stateIndexes: Record<CheckoutState, number> = {
  tickets: 0,
  account: 1,
  payment: 2,
  confirmation: 3,
};

const qrCells = [
  true,
  false,
  true,
  true,
  true,
  true,
  true,
  false,
  true,
  false,
  true,
  true,
  true,
  false,
  false,
  false,
] as const;

function OrderSummary({
  total,
  showPromo,
  promoCode,
  promoApplied,
  ticketName,
  quantity,
  eventTitle,
  eventDate,
  eventImage,
  onPromoCodeChange,
  onApplyPromo,
}: OrderSummaryProps) {
  const serviceFee = total * 0.15;
  const discount = promoApplied ? total * 0.1 : 0;

  return (
    <aside className="ticket-buying__summary" aria-label="Order summary">
      <h2>Order Summary</h2>
      <div className="ticket-buying__event">
        <img
          className="ticket-buying__event-art"
          src={eventImage || "https://placehold.co/64x64"}
          alt={eventTitle}
        />

        <div>
          <strong>{eventTitle}</strong>
          <span>
            {ticketName} × {quantity}
          </span>
          <time dateTime={eventDate}>
            {new Date(eventDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>
      </div>
      <dl className="ticket-buying__totals">
        <div>
          <dt>
            {quantity}x {ticketName}
          </dt>
          <dd>${total.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Service fee (15%)</dt>
          <dd>${serviceFee.toFixed(2)}</dd>
        </div>
        {promoApplied && (
          <div className="ticket-buying__discount">
            <dt>Promo (STAGEFRONT10)</dt>
            <dd>−${discount.toFixed(2)}</dd>
          </div>
        )}
        <div className="ticket-buying__total">
          <dt>Total</dt>
          <dd>${(total + serviceFee - discount).toFixed(2)}</dd>
        </div>
      </dl>
      {showPromo && !promoApplied && (
        <div className="ticket-buying__promo">
          <input
            aria-label="Promo code"
            value={promoCode}
            onChange={(event) =>
              onPromoCodeChange(event.target.value.toUpperCase())
            }
            placeholder="Promo code"
          />
          <Button variant="secondary-neutral" size="sm" onClick={onApplyPromo}>
            Apply
          </Button>
        </div>
      )}
    </aside>
  );
}

export default function TicketBuying() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const ticketType = searchParams.get("ticketType");
  const quantity = Number(searchParams.get("quantity") || 1);

  console.log(
    "URL params - eventId:",
    eventId,
    "ticketType:",
    ticketType,
    "quantity:",
    quantity,
  );
  const [currentState, setCurrentState] = useState<CheckoutState>("tickets");
  const [selectedAddOns, setSelectedAddOns] = useState<AddOnId[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [event, setEvent] = useState<EventData | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const selectedTicket = event?.tickets.find(
    (ticket) => ticket.type === ticketType,
  );
  useEffect(() => {
    if (!eventId) {
      console.log("No eventId provided");
      return;
    }

    const fetchEvent = async () => {
      try {
        console.log("Fetching event:", eventId);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/event/${eventId}`,
          {
            credentials: "include",
          },
        );

        console.log("Event fetch status:", response.status);
        const result = await response.json();

        if (result.success) {
          console.log("✓ Event loaded:", result.data.title);
          setEvent(result.data);
        } else {
          console.log("✗ Event fetch failed:", result);
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
      }
    };

    fetchEvent();
  }, [eventId]);

  // Debug auth status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/user`,
          {
            credentials: "include",
          },
        );
        console.log("Auth check - Status:", response.status);
        const data = await response.json();
        if (response.ok) {
          console.log("✓ Authenticated as:", data.data?.email || "Unknown");
        } else {
          console.log("✗ Not authenticated:", data);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    checkAuth();
  }, []);
  const baseTicketPrice = selectedTicket?.price ?? 0;

  const addOnTotal = addOns
    .filter((addOn) => selectedAddOns.includes(addOn.id))
    .reduce((sum, addOn) => sum + addOn.price, 0);

  const ticketTotal = baseTicketPrice * quantity + addOnTotal;

  const checkoutTotal =
    ticketTotal * 1.15 - (promoApplied ? ticketTotal * 0.1 : 0);

  const toggleAddOn = (id: AddOnId, checked: boolean) => {
    setSelectedAddOns((selected) =>
      checked
        ? [...selected, id]
        : selected.filter((selectedId) => selectedId !== id),
    );
  };

  const goBack = () => {
    if (currentState === "tickets" && eventId) {
      router.push(`/events/${eventId}`);
      return;
    }
    const previousState: Record<
      Exclude<CheckoutState, "tickets">,
      CheckoutState
    > = {
      account: "tickets",
      payment: "account",
      confirmation: "payment",
    };
    if (currentState !== "tickets")
      setCurrentState(previousState[currentState]);
  };

  const handleContinueToPayment = async () => {
    try {
      setIsProcessing(true);

      if (!event || !selectedTicket) {
        setPaymentError("Event or ticket information missing");
        return;
      }

      // Create order on backend
      const orderResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            eventId,
            tickets: [
              {
                type: selectedTicket.type,
                price: selectedTicket.price,
                quantity,
                eventId,
              },
            ],
            addOns: selectedAddOns,
          }),
        },
      );

      if (!orderResponse.ok) {
        throw new Error("Failed to create order");
      }

      const { data } = await orderResponse.json();
      setOrderId(data.id);
      setCurrentState("payment");
    } catch (error) {
      setPaymentError(
        error instanceof Error ? error.message : "Failed to create order",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="ticket-buying">
      <div className="ticket-buying__container">
        <header className="ticket-buying__header">
          <button
            className="ticket-buying__back-link"
            type="button"
            onClick={goBack}
          >
            ← Back to event
          </button>
          <h1>Checkout</h1>
        </header>

        <ProgressStepper
          steps={checkoutSteps}
          currentStepIndex={stateIndexes[currentState]}
          ariaLabel="Checkout progress"
          className="ticket-buying__stepper"
        />

        {currentState === "confirmation" ? (
          <section className="ticket-buying__confirmation">
            <div className="ticket-buying__success" aria-hidden="true">
              ✓
            </div>
            <h1>You&apos;re going!</h1>
            <p>
              Tickets for <strong>The Weeknd — After Hours Til Dawn</strong>{" "}
              confirmed.
            </p>
            <div className="ticket-buying__order-number">
              <span>Order #</span>
              <strong>ORD-88421</strong>
            </div>
            <article className="ticket-buying__ticket">
              <div className="ticket-buying__qr" aria-label="Ticket QR code">
                {qrCells.map((filled, index) => (
                  <span
                    className={filled ? "ticket-buying__qr-cell--filled" : ""}
                    key={index}
                  />
                ))}
              </div>
              <h2>The Weeknd</h2>
              <p>SoFi Stadium · Sep 12, 2026</p>
              <small>General Admission · Seat TBD</small>
            </article>
            <div className="ticket-buying__ticket-actions">
              <Button variant="secondary-neutral" size="sm">
                📱 Add to Wallet
              </Button>
              <Button variant="secondary-neutral" size="sm">
                📄 Download PDF
              </Button>
              <Button variant="secondary-neutral" size="sm">
                ✉️ Email Ticket
              </Button>
            </div>
            <Button size="lg">View My Tickets</Button>
          </section>
        ) : (
          <div className="ticket-buying__layout">
            <main className="ticket-buying__main">
              {currentState === "tickets" && (
                <section>
                  <h1>Confirm Your Tickets</h1>
                  <article className="ticket-buying__ticket-choice">
                    <div>
                      <h2>
                        {selectedTicket?.type
                          ?.replaceAll("_", " ")
                          .replace(/\b\w/g, (char) => char.toUpperCase())}
                      </h2>
                      <ul>
                        <li>General Admission</li>
                        <li>Commemorative poster</li>
                        <li>Digital ticket</li>
                      </ul>
                    </div>
                    <div className="ticket-buying__price">
                      <strong>${selectedTicket?.price.toFixed(2)}</strong>
                      <span>per ticket</span>
                    </div>
                  </article>
                  <h2 className="ticket-buying__section-title">Add-ons</h2>
                  <div className="ticket-buying__add-ons">
                    {addOns.map((addOn) => (
                      <div className="ticket-buying__add-on" key={addOn.id}>
                        <Checkbox
                          checked={selectedAddOns.includes(addOn.id)}
                          onChange={(checked) => toggleAddOn(addOn.id, checked)}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            toggleAddOn(
                              addOn.id,
                              !selectedAddOns.includes(addOn.id),
                            )
                          }
                        >
                          <span>
                            <strong>{addOn.name}</strong>
                            {addOn.description}
                          </span>
                          <b>+${addOn.price}</b>
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button
                    className="ticket-buying__primary-action"
                    size="lg"
                    onClick={() => setCurrentState("account")}
                  >
                    Continue to Account Info
                  </Button>
                </section>
              )}

              {currentState === "account" && (
                <section>
                  <h1>Account Info</h1>
                  <article className="ticket-buying__account-choice">
                    <h2>Already have an account?</h2>
                    <div>
                      <Button variant="secondary" size="sm">
                        Log in
                      </Button>
                      <Button variant="secondary-neutral" size="sm">
                        Continue as Guest
                      </Button>
                    </div>
                  </article>
                  <div className="ticket-buying__form ticket-buying__form--account">
                    <InputField label="First Name" defaultValue="Alex" />
                    <InputField label="Last Name" defaultValue="Rivera" />
                    <InputField
                      label="Email Address"
                      type="email"
                      defaultValue="alex@example.com"
                    />
                    <InputField
                      label="Phone (optional)"
                      type="tel"
                      defaultValue="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="ticket-buying__navigation-actions">
                    <Button
                      variant="secondary-neutral"
                      size="lg"
                      onClick={goBack}
                    >
                      ← Back
                    </Button>
                    <Button
                      size="lg"
                      onClick={handleContinueToPayment}
                      disabled={isProcessing}
                    >
                      {isProcessing
                        ? "Creating order..."
                        : "Continue to Payment"}
                    </Button>
                  </div>
                  {paymentError && (
                    <p style={{ color: "red", marginTop: "1rem" }}>
                      {paymentError}
                    </p>
                  )}
                </section>
              )}

              {currentState === "payment" && (
                <section>
                  <h1>Payment</h1>
                  <Elements stripe={stripePromise}>
                    <PaymentForm
                      orderId={orderId}
                      checkoutTotal={checkoutTotal}
                      isProcessing={isProcessing}
                      onSuccess={() => setCurrentState("confirmation")}
                      onError={setPaymentError}
                    />
                  </Elements>
                  <p className="ticket-buying__secure">
                    <span aria-hidden="true">▣</span>Your payment is secured
                    with 256-bit SSL encryption
                  </p>
                  <Button
                    variant="secondary-neutral"
                    size="lg"
                    onClick={goBack}
                    style={{ marginTop: "1rem" }}
                  >
                    ← Back
                  </Button>
                  {paymentError && (
                    <p style={{ color: "red", marginTop: "1rem" }}>
                      {paymentError}
                    </p>
                  )}
                </section>
              )}
            </main>
            <OrderSummary
              total={ticketTotal}
              showPromo={currentState === "payment"}
              promoCode={promoCode}
              promoApplied={promoApplied}
              ticketName={
                selectedTicket?.type
                  ?.replaceAll("_", " ")
                  .replace(/\b\w/g, (char) => char.toUpperCase()) || ""
              }
              quantity={quantity}
              eventTitle={event?.title || ""}
              eventDate={event?.date || ""}
              eventImage={event?.images?.[0] || ""}
              onPromoCodeChange={setPromoCode}
              onApplyPromo={() => {
                if (promoCode === "STAGEFRONT10") {
                  setPromoApplied(true);
                }
              }}
            />
          </div>
        )}
      </div>

      <section className="ticket-buying__newsletter">
        <div className="ticket-buying__newsletter-inner">
          <div>
            <h2>Never miss a show</h2>
            <p>
              Get early access to presales and exclusive event announcements.
            </p>
          </div>
          <form onSubmit={(event) => event.preventDefault()}>
            <input
              aria-label="Email address"
              type="email"
              placeholder="Enter your email"
            />
            <Button type="submit" size="sm">
              Subscribe
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
