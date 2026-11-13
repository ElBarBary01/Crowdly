import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import type { PaymentStatus } from "../generated/prisma/enums";
import { startTestMongo } from "./helpers/mongo";

const webhookSecret = "whsec_crowdly_local_tests";
let mongo: Awaited<ReturnType<typeof startTestMongo>> | undefined;
let prisma: typeof import("../src/lib/prisma").default;
let stripe: typeof import("../src/lib/stripe").stripe;
let server: Server | undefined;
let baseURL: string;

before(async () => {
  mongo = await startTestMongo();
  process.env.DATABASE_URL = mongo.url;
  process.env.STRIPE_SECRET_KEY = "sk_test_crowdly_local_tests";
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  process.env.RESEND_API_KEY = "re_crowdly_local_tests";
  process.env.JWT_SECRET = "crowdly-local-test-secret";

  ({ default: prisma } = await import("../src/lib/prisma"));
  ({ stripe } = await import("../src/lib/stripe"));
  const { createApp } = await import("../src/app");
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");
  baseURL = `http://127.0.0.1:${address.port}`;
}, { timeout: 60_000 });

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server!.close((error) => error ? reject(error) : resolve());
    });
  }
  if (prisma) await prisma.$disconnect();
  await mongo?.stop();
}, { timeout: 30_000 });

async function fixture(stock = [5]) {
  const user = await prisma.user.create({
    data: { name: "Test customer", email: `${randomUUID()}@example.test`, password: "unused" },
  });
  const venue = await prisma.venue.create({
    data: {
      name: "Test venue", capacity: 100, location: "Test city",
      stageSections: [], images: [], amenities: [], policies: [],
    },
  });
  const events = await Promise.all(stock.map((quantity, index) => prisma.event.create({
    data: {
      title: `Test event ${index}`, date: new Date(`2099-01-${String(index + 1).padStart(2, "0")}T20:00:00Z`),
      time: "20:00", venueId: venue.id, genres: [], images: [],
      tickets: [{ type: "VIP", price: 10, quantity }],
    },
  })));
  const order = await prisma.order.create({
    data: {
      userId: user.id, status: "PAYMENT", paymentStatus: "PENDING",
      totalPrice: 20 * events.length,
      tickets: events.map((event) => ({ eventId: event.id, type: "VIP", price: 10, quantity: 2 })),
      events: events.map((event) => ({
        id: event.id, title: event.title, date: event.date, time: event.time,
        venueId: venue.id, venueName: venue.name,
      })),
    },
  });
  const paymentIntentId = `pi_${randomUUID()}`;
  const attempt = await prisma.paymentAttempt.create({
    data: {
      orderId: order.id, provider: "STRIPE", providerReference: paymentIntentId,
      paymentIntentId, amount: order.totalPrice, currency: "usd", status: "PENDING",
    },
  });
  return { order, attempt, events };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;
type PaymentEventType = "payment_intent.succeeded" | "payment_intent.payment_failed" | "payment_intent.canceled";

function paymentEvent(data: Fixture, type: PaymentEventType = "payment_intent.succeeded") {
  return {
    id: `evt_${randomUUID()}`, object: "event", type,
    api_version: "2025-04-30.basil", created: Math.floor(Date.now() / 1000),
    livemode: false, pending_webhooks: 1, request: null,
    data: {
      object: {
        id: data.attempt.paymentIntentId, object: "payment_intent",
        status: type === "payment_intent.succeeded" ? "succeeded"
          : type === "payment_intent.canceled" ? "canceled" : "requires_payment_method",
        amount: Math.round(data.order.totalPrice * 100),
        amount_received: type === "payment_intent.succeeded" ? Math.round(data.order.totalPrice * 100) : 0,
        currency: "usd", metadata: { orderId: data.order.id, note: "تذاكر — VIP" },
      },
    },
  };
}

async function deliver(event: unknown, options: { signature?: string | null; body?: string; contentType?: string } = {}) {
  const payload = JSON.stringify(event, null, 2);
  const signature = options.signature === undefined
    ? stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret })
    : options.signature;
  return fetch(`${baseURL}/payments/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": options.contentType ?? "application/json",
      ...(signature === null ? {} : { "Stripe-Signature": signature }),
    },
    body: options.body ?? payload,
    signal: AbortSignal.timeout(10_000),
  });
}

async function expectState(data: Fixture, status: PaymentStatus, quantities: number[]) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: data.order.id } });
  const attempt = await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: data.attempt.id } });
  assert.equal(order.paymentStatus, status);
  assert.equal(attempt.status, status);
  assert.equal(order.status, status === "SUCCEEDED" ? "CONFIRMATION" : "PAYMENT");
  for (const [index, event] of data.events.entries()) {
    const stored = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    assert.equal(stored.tickets[0].quantity, quantities[index]);
  }
}

test("a signed JSON webhook preserves whitespace and Unicode, confirms the order, and consumes stock", async () => {
  const data = await fixture();
  const response = await deliver(paymentEvent(data));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
  await expectState(data, "SUCCEEDED", [3]);
});

test("missing, invalid, stale, and tampered signatures cannot change an order", async () => {
  const data = await fixture();
  const event = paymentEvent(data);
  const stale = stripe.webhooks.generateTestHeaderString({
    payload: JSON.stringify(event, null, 2), secret: webhookSecret,
    timestamp: Math.floor(Date.now() / 1000) - 3600,
  });
  for (const options of [
    { signature: null }, { signature: "invalid" }, { signature: stale },
    { body: JSON.stringify(event) }, { contentType: "text/plain" }, { body: "" },
  ]) {
    assert.equal((await deliver(event, options)).status, 400);
  }
  await expectState(data, "PENDING", [5]);
});

test("unsupported events and PaymentIntents without order metadata are acknowledged without fulfillment", async () => {
  const data = await fixture();
  const event = paymentEvent(data);
  assert.equal((await deliver({ ...event, type: "charge.succeeded" })).status, 200);
  event.data.object.object = "charge";
  assert.equal((await deliver(event)).status, 200);
  event.data.object.object = "payment_intent";
  event.data.object.metadata.orderId = "";
  assert.equal((await deliver(event)).status, 200);
  await expectState(data, "PENDING", [5]);
});

test("replayed events and different success event IDs for one intent consume inventory once", async () => {
  const data = await fixture();
  const event = paymentEvent(data);
  for (const delivery of [event, event, paymentEvent(data)]) {
    assert.equal((await deliver(delivery)).status, 200);
  }
  await expectState(data, "SUCCEEDED", [3]);
});

test("concurrent duplicate deliveries can be retried without double fulfillment", async (context) => {
  context.mock.method(console, "error", () => {});
  const data = await fixture();
  const event = paymentEvent(data);
  const responses = await Promise.all(Array.from({ length: 8 }, () => deliver(event)));
  assert(responses.some((response) => response.status === 200));
  for (const response of responses) {
    assert([200, 500].includes(response.status));
    if (response.status === 500) assert.equal((await deliver(event)).status, 200);
  }
  await expectState(data, "SUCCEEDED", [3]);
});

test("a declined intent can later succeed, and late failure/cancellation events cannot undo success", async () => {
  const data = await fixture();
  assert.equal((await deliver(paymentEvent(data, "payment_intent.payment_failed"))).status, 200);
  await expectState(data, "FAILED", [5]);
  assert.equal((await deliver(paymentEvent(data))).status, 200);
  for (const type of ["payment_intent.payment_failed", "payment_intent.canceled"] as const) {
    assert.equal((await deliver(paymentEvent(data, type))).status, 200);
  }
  await expectState(data, "SUCCEEDED", [3]);
});

test("a cancellation event changes payment state without consuming inventory", async () => {
  const data = await fixture();
  assert.equal((await deliver(paymentEvent(data, "payment_intent.canceled"))).status, 200);
  assert.equal((await deliver(paymentEvent(data, "payment_intent.payment_failed"))).status, 200);
  await expectState(data, "CANCELLED", [5]);
});

test("success is recovered after an earlier local cancellation", async () => {
  const data = await fixture();
  await prisma.paymentAttempt.update({ where: { id: data.attempt.id }, data: { status: "CANCELLED" } });
  await prisma.order.update({ where: { id: data.order.id }, data: { paymentStatus: "CANCELLED" } });
  assert.equal((await deliver(paymentEvent(data))).status, 200);
  await expectState(data, "SUCCEEDED", [3]);
});

test("two successful intents for one order are recorded without consuming stock twice", async (context) => {
  context.mock.method(console, "error", () => {});
  const data = await fixture();
  const secondIntent = `pi_${randomUUID()}`;
  const second = await prisma.paymentAttempt.create({ data: {
    orderId: data.order.id, provider: "STRIPE", providerReference: secondIntent,
    paymentIntentId: secondIntent, amount: data.order.totalPrice, currency: "usd", status: "PENDING",
  } });
  const events = [paymentEvent(data), paymentEvent({ ...data, attempt: second })];
  const responses = await Promise.all(events.map((event) => deliver(event)));
  for (const [index, response] of responses.entries()) {
    assert([200, 500].includes(response.status));
    if (response.status === 500) assert.equal((await deliver(events[index])).status, 200);
  }
  await expectState(data, "SUCCEEDED", [3]);
  assert.equal((await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: second.id } })).status, "SUCCEEDED");
});

test("failure on another intent cannot downgrade an already paid order", async () => {
  const data = await fixture();
  assert.equal((await deliver(paymentEvent(data))).status, 200);
  const otherIntent = `pi_${randomUUID()}`;
  const other = await prisma.paymentAttempt.create({ data: {
    orderId: data.order.id, provider: "STRIPE", providerReference: otherIntent,
    paymentIntentId: otherIntent, amount: data.order.totalPrice, currency: "usd", status: "PENDING",
  } });
  assert.equal((await deliver(paymentEvent({ ...data, attempt: other }, "payment_intent.payment_failed"))).status, 200);
  await expectState(data, "SUCCEEDED", [3]);
  assert.equal((await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: other.id } })).status, "FAILED");
});

test("amount, received amount, and currency mismatches cannot fulfill an order", async (context) => {
  context.mock.method(console, "error", () => {});
  const data = await fixture();
  for (const mismatch of [{ amount: 1 }, { amount_received: 1 }, { currency: "eur" }]) {
    const event = paymentEvent(data);
    Object.assign(event.data.object, mismatch);
    assert.equal((await deliver(event)).status, 500);
    await expectState(data, "PENDING", [5]);
  }
});

test("an inventory failure rolls back earlier ticket updates and leaves the delivery retryable", async (context) => {
  context.mock.method(console, "error", () => {});
  const data = await fixture([5, 0]);
  const event = paymentEvent(data);
  assert.equal((await deliver(event)).status, 500);
  await expectState(data, "PENDING", [5, 0]);

  await prisma.event.update({ where: { id: data.events[1].id }, data: {
    tickets: { updateMany: { where: { type: "VIP" }, data: { quantity: 5 } } },
  } });
  assert.equal((await deliver(event)).status, 200);
  await expectState(data, "SUCCEEDED", [3, 3]);
});

test("a delivery before its attempt is saved fails and succeeds when replayed after persistence", async (context) => {
  context.mock.method(console, "error", () => {});
  const data = await fixture();
  const event = paymentEvent(data);
  await prisma.paymentAttempt.delete({ where: { id: data.attempt.id } });
  assert.equal((await deliver(event)).status, 500);
  await prisma.paymentAttempt.create({ data: data.attempt });
  assert.equal((await deliver(event)).status, 200);
  await expectState(data, "SUCCEEDED", [3]);
});

test("a missing webhook secret reports a server failure instead of blaming the signature", async (context) => {
  context.mock.method(console, "error", () => {});
  const data = await fixture();
  delete process.env.STRIPE_WEBHOOK_SECRET;
  try {
    assert.equal((await deliver(paymentEvent(data))).status, 500);
    await expectState(data, "PENDING", [5]);
  } finally {
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  }
});

test("ordinary payment endpoints still receive parsed JSON", async () => {
  const response = await fetch(`${baseURL}/payments/create`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, "orderId is required");
});
