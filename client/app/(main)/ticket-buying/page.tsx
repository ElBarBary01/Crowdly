"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/app/hooks/user/use-user";
import Button from "../../components/ui/Button";
import PaymentForm from "./PaymentForm";
import "./TicketBuying.css";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
const api = process.env.NEXT_PUBLIC_API_URL;
type Pricing = {
  subtotalAmount: number;
  addOnAmount: number;
  feeAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
};
type CheckoutOrder = Pricing & {
  id: string;
  status: string;
  paymentStatus: string;
  expiresAt: string | null;
  serverNow: string;
  confirmed: boolean;
  expired: boolean;
  ticketsCancelledAt: string | null;
  events: { title: string; venueName: string; date: string }[];
};
type CatalogItem = {
  id: string;
  name: string;
  description: string;
  amount: number;
};
type Event = {
  title: string;
  date: string;
  images: string[];
  tickets: { type: string; price: number; quantity: number }[];
  venue: { name: string };
};
type Saved = { requestId: string; orderId?: string; cart?: string };
const usd = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount / 100,
  );
async function request<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(api + path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.message || result.error || "Unable to complete the request",
    );
  return result.data ?? result;
}
function save(key: string, value: Saved) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* In-memory retry protection still works when storage is unavailable. */
  }
}

function Checkout() {
  const params = useSearchParams();
  const router = useRouter();
  const eventId = params.get("eventId") ?? "";
  const type = (params.get("ticketType") ?? "").toUpperCase();
  const quantity = Number(params.get("quantity") || 1);
  const valid = Boolean(
    eventId && type && Number.isSafeInteger(quantity) && quantity > 0,
  );
  const { data: user, isLoading: userLoading } = useUser();
  const [event, setEvent] = useState<Event | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [addOns, setAddOns] = useState<string[]>([]);
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [quoteResult, setQuoteResult] = useState<{
    cart: string;
    pricing: Pricing;
  } | null>(null);
  const [orderResult, setOrderResult] = useState<{
    key: string;
    order: CheckoutOrder;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const [clock, setClock] = useState(0);
  const saved = useRef<Saved | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const cart = JSON.stringify({
    tickets: [{ eventId, type, quantity }],
    addOns,
    promoCode,
  });
  // Keep the active order discoverable after refresh, even when local add-on
  // controls reset. Its frozen server prices override the selection quote.
  const storageKey = user
    ? "crowdly-checkout:" + JSON.stringify([user.id, eventId, type, quantity])
    : "";
  const order = orderResult?.key === storageKey ? orderResult.order : null;
  const orderId = order?.id;
  const quote = quoteResult?.cart === cart ? quoteResult.pricing : null;
  const restoring = Boolean(storageKey && restoredKey !== storageKey);
  const acceptOrder = useCallback(
    (updated: CheckoutOrder) => {
      setClockOffset(new Date(updated.serverNow).getTime() - Date.now());
      setOrderResult({ key: storageKey, order: updated });
      setClock(Date.now());
    },
    [storageKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    if (valid)
      void request<Event>(
        "/event/" + encodeURIComponent(eventId),
        undefined,
        controller.signal,
      )
        .then(setEvent)
        .catch((reason) => {
          if (!controller.signal.aborted) setError(reason.message);
        });
    void request<{ addOns: CatalogItem[] }>(
      "/payments/pricing",
      undefined,
      controller.signal,
    )
      .then((result) => setCatalog(result.addOns))
      .catch(() => {});
    return () => controller.abort();
  }, [eventId, valid]);

  useEffect(() => {
    const controller = new AbortController();
    if (!valid || order) return;
    void request<Pricing>(
      "/payments/quote",
      JSON.parse(cart),
      controller.signal,
    )
      .then((result) => {
        setQuoteResult({ cart, pricing: result });
        setError("");
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => controller.abort();
  }, [cart, valid, order]);

  useEffect(() => {
    const controller = new AbortController();
    async function restore() {
      saved.current = null;
      if (!storageKey) return;
      let record: Saved | null = null;
      try {
        record = JSON.parse(
          sessionStorage.getItem(storageKey) || "null",
        ) as Saved | null;
      } catch {
        /* Malformed local storage is discarded. */
      }
      if (!record || typeof record.requestId !== "string")
        record = { requestId: crypto.randomUUID() };
      saved.current = record;
      save(storageKey, record);
      try {
        let restored: CheckoutOrder | undefined;
        if (record.orderId)
          restored = await request<CheckoutOrder>(
            "/order/" + encodeURIComponent(record.orderId),
            undefined,
            controller.signal,
          );
        else if (record.cart)
          restored = await request<CheckoutOrder>(
            "/order",
            { ...JSON.parse(record.cart), requestId: record.requestId },
            controller.signal,
          );
        if (restored) {
          saved.current = { ...record, orderId: restored.id };
          save(storageKey, saved.current);
          acceptOrder(restored);
        }
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            "Could not restore this reservation: " +
              (reason instanceof Error ? reason.message : "Try again"),
          );
      } finally {
        if (!controller.signal.aborted) setRestoredKey(storageKey);
      }
    }
    void restore();
    return () => controller.abort();
  }, [storageKey, acceptOrder]);

  const refreshOrder = useCallback(
    async (signal?: AbortSignal) => {
      if (!orderId) return;
      try {
        const updated = await request<CheckoutOrder>(
          "/payments/status",
          { orderId },
          signal,
        );
        acceptOrder(updated);
      } catch (reason) {
        if (!signal?.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Payment confirmation is pending. Retrying shortly.",
          );
      }
    },
    [orderId, acceptOrder],
  );

  const shouldPoll = Boolean(
    order &&
    !order.confirmed &&
    !["EXPIRED", "CANCELLED"].includes(order.status),
  );
  useEffect(() => {
    if (!shouldPoll) return;
    const controller = new AbortController();
    let checking = false;
    const timer = setInterval(() => {
      if (!checking) {
        checking = true;
        void refreshOrder(controller.signal).finally(() => {
          checking = false;
        });
      }
    }, 3000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [shouldPoll, orderId, refreshOrder]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = order?.expiresAt
    ? Math.max(0, new Date(order.expiresAt).getTime() - clock - clockOffset)
    : 0;
  const ended = Boolean(
    order && (order.expired || ["EXPIRED", "CANCELLED"].includes(order.status)),
  );
  const pricing = order ?? quote;
  const canPay = Boolean(
    order &&
    remaining > 0 &&
    !ended &&
    !order.confirmed &&
    order.status !== "PAYMENT_REVIEW",
  );
  const reserve = async () => {
    if (busy || !quote || !user || !valid || !storageKey || restoring) return;
    setBusy(true);
    setError("");
    const record = {
      ...(saved.current ?? { requestId: crypto.randomUUID() }),
      cart: saved.current?.cart ?? cart,
    };
    saved.current = record;
    save(storageKey, record);
    try {
      const result = await request<CheckoutOrder>("/order", {
        ...JSON.parse(record.cart),
        requestId: record.requestId,
      });
      save(storageKey, { ...record, orderId: result.id });
      saved.current = { ...record, orderId: result.id };
      acceptOrder(result);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not reserve tickets",
      );
    } finally {
      setBusy(false);
    }
  };
  const cancel = async () => {
    if (!order || busy) return;
    setBusy(true);
    setError("");
    try {
      await request("/payments/cancel", { orderId: order.id });
      await refreshOrder();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Cancellation is pending",
      );
    } finally {
      setBusy(false);
    }
  };
  const startAgain = () => {
    const record = { requestId: crypto.randomUUID() };
    saved.current = record;
    save(storageKey, record);
    setOrderResult(null);
    setError("");
    setVerifying(false);
  };
  const login = () =>
    router.push(
      "/login?redirect=" +
        encodeURIComponent(window.location.pathname + window.location.search),
    );

  return (
    <div className="ticket-buying">
      <div className="ticket-buying__container">
        <header className="ticket-buying__header">
          <button
            className="ticket-buying__back-link"
            onClick={() => router.push("/events/" + eventId)}
          >
            Back to event
          </button>
          <h1>Checkout</h1>
        </header>
        {!valid ? (
          <p role="alert">
            Choose an event, ticket category, and valid quantity first.
          </p>
        ) : (
          <div className="ticket-buying__layout">
            <main className="ticket-buying__main">
              <h2>{event?.title ?? "Loading event..."}</h2>
              <p>
                {type.replaceAll("_", " ")} x {quantity}
              </p>
              {restoring || userLoading ? (
                <p role="status">Restoring checkout...</p>
              ) : order?.confirmed ? (
                <section className="ticket-buying__confirmation">
                  <h1>You&apos;re going!</h1>
                  <p>Your payment and reservation are confirmed.</p>
                  <p>Order #{order.id}</p>
                  {order.events.map((item, index) => (
                    <p key={index}>
                      {item.title} | {item.venueName} |{" "}
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  ))}
                </section>
              ) : ended ? (
                <section>
                  <h2>
                    {order?.paymentStatus === "REFUNDED"
                      ? "Payment refunded"
                      : order?.status === "CANCELLED"
                        ? "Reservation cancelled"
                        : "Reservation expired"}
                  </h2>
                  <p>
                    {order?.paymentStatus === "REFUNDED"
                      ? "Your payment was refunded and these tickets are no longer valid."
                      : "You can check availability and start a new reservation."}
                  </p>
                  <Button onClick={startAgain}>Check tickets again</Button>
                </section>
              ) : order ? (
                <section>
                  <h2>Payment</h2>
                  <p role="timer" aria-live="off">
                    {remaining > 0
                      ? "Tickets held for " +
                        Math.floor(remaining / 60000) +
                        ":" +
                        String(Math.floor(remaining / 1000) % 60).padStart(
                          2,
                          "0",
                        )
                      : "Reservation window ended. Checking payment status..."}
                  </p>
                  {verifying && (
                    <p role="status">
                      Confirming your payment and tickets. You can safely
                      refresh this page.
                    </p>
                  )}
                  {order.status === "PAYMENT_REVIEW" && (
                    <p role="status">
                      Your payment needs review. If tickets cannot be confirmed,
                      the payment will be refunded.
                    </p>
                  )}
                  {stripePromise ? (
                    <Elements stripe={stripePromise}>
                      <PaymentForm
                        orderId={order.id}
                        checkoutTotal={order.totalAmount / 100}
                        isProcessing={busy || verifying}
                        disabled={!canPay}
                        billingName={user?.name ?? ""}
                        onProcessing={() => setVerifying(true)}
                        onSuccess={() => {
                          setVerifying(true);
                          void refreshOrder();
                        }}
                        onError={(message) => {
                          setError(message);
                          setVerifying(false);
                          void refreshOrder();
                        }}
                      />
                    </Elements>
                  ) : (
                    <p role="alert">
                      Card payments are unavailable until the Stripe test
                      publishable key is configured.
                    </p>
                  )}
                  <Button
                    variant="secondary-neutral"
                    onClick={cancel}
                    disabled={busy || verifying}
                  >
                    Cancel reservation
                  </Button>
                  <Button
                    variant="secondary-neutral"
                    onClick={() => void refreshOrder()}
                    disabled={busy}
                  >
                    Check payment status
                  </Button>
                </section>
              ) : (
                <section>
                  <h2>Add-ons</h2>
                  <div className="ticket-buying__add-ons">
                    {catalog.map((item) => (
                      <label key={item.id}>
                        <input
                          type="checkbox"
                          checked={addOns.includes(item.id)}
                          onChange={(event) =>
                            setAddOns((selected) =>
                              event.target.checked
                                ? [...selected, item.id].sort()
                                : selected.filter((id) => id !== item.id),
                            )
                          }
                        />{" "}
                        {item.name} - {usd(item.amount)}
                        <p>{item.description}</p>
                      </label>
                    ))}
                  </div>
                  <label>
                    Promo code{" "}
                    <input
                      value={promoInput}
                      onChange={(event) =>
                        setPromoInput(event.target.value.toUpperCase())
                      }
                    />
                  </label>
                  <Button
                    variant="secondary-neutral"
                    onClick={() => setPromoCode(promoInput.trim())}
                  >
                    Apply code
                  </Button>
                  <p>
                    Your tickets will be held for 15 minutes once your
                    reservation is created. Refreshing does not extend the hold.
                  </p>
                  {user ? (
                    <>
                      <p>Booking as {user.name}</p>
                      <Button onClick={reserve} disabled={busy || !quote}>
                        {busy
                          ? "Reserving tickets..."
                          : "Reserve tickets and continue"}
                      </Button>
                    </>
                  ) : (
                    <Button onClick={login}>Log in to reserve tickets</Button>
                  )}
                </section>
              )}
              {error && (
                <p role="alert" className="ticket-buying__error">
                  {error}
                </p>
              )}
            </main>
            <aside
              className="ticket-buying__summary"
              aria-label="Order summary"
            >
              <h2>Order Summary</h2>
              {pricing ? (
                <dl className="ticket-buying__totals">
                  <div>
                    <dt>Tickets</dt>
                    <dd>{usd(pricing.subtotalAmount)}</dd>
                  </div>
                  <div>
                    <dt>Add-ons</dt>
                    <dd>{usd(pricing.addOnAmount)}</dd>
                  </div>
                  <div>
                    <dt>Service fee</dt>
                    <dd>{usd(pricing.feeAmount)}</dd>
                  </div>
                  {pricing.discountAmount > 0 && (
                    <div>
                      <dt>Discount</dt>
                      <dd>-{usd(pricing.discountAmount)}</dd>
                    </div>
                  )}
                  <div className="ticket-buying__total">
                    <dt>Total</dt>
                    <dd>{usd(pricing.totalAmount)}</dd>
                  </div>
                </dl>
              ) : (
                <p>Checking current pricing...</p>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
export default function TicketBuying() {
  return (
    <Suspense fallback={<p>Loading checkout...</p>}>
      <Checkout />
    </Suspense>
  );
}
