import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { Server } from "node:http";
import { after, before, test } from "node:test";
import type { TestContext } from "node:test";
import type Stripe from "stripe";
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

async function heldOrder(stock = [5], quantity = 2) {
  const data = await fixture(stock);
  const { createOrder } = await import("../src/service/order");
  const dto = {
    userId: data.order.userId,
    tickets: data.events.map((event) => ({
      eventId: event.id,
      type: "VIP",
      quantity,
    })),
  };
  const order = await createOrder(dto);
  return { ...data, order, dto };
}

function mockStripeCreation(context: TestContext) {
  const intents = new Map<string, Stripe.Response<Stripe.PaymentIntent>>();
  context.mock.method(
    stripe.paymentIntents,
    "create",
    async (
      params: Stripe.PaymentIntentCreateParams,
      options?: Stripe.RequestOptions,
    ) => {
      assert(options?.idempotencyKey);
      let intent = intents.get(options.idempotencyKey);
      if (!intent) {
        const id = `pi_${randomUUID()}`;
        intent = {
          id,
          client_secret: `${id}_secret`,
          status: "requires_payment_method",
          ...params,
        } as Stripe.Response<Stripe.PaymentIntent>;
        intents.set(options.idempotencyKey, intent);
      }
      return intent;
    },
  );
  return intents;
}

async function makeExpired(orderId: string) {
  const expiresAt = new Date(Date.now() - 1000);
  await prisma.order.update({ where: { id: orderId }, data: { expiresAt } });
  await prisma.ticketReservation.updateMany({
    where: { orderId },
    data: { expiresAt },
  });
}

test("only one of eight competing requests can reserve the last ticket", async () => {
  const data = await fixture([1]);
  const { createOrder } = await import("../src/service/order");
  const beforeCount = await prisma.order.count();
  const requests = Array.from({ length: 8 }, () =>
    createOrder({
      userId: data.order.userId,
      tickets: [{ eventId: data.events[0].id, type: "VIP", quantity: 1 }],
    }),
  );
  const results = await Promise.allSettled(requests);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(await prisma.order.count(), beforeCount + 1);
  assert.equal(
    await prisma.ticketReservation.count({
      where: { eventId: data.events[0].id },
    }),
    1,
  );
});

test("duplicate lines are aggregated and oversized/invalid orders do not reserve stock", async () => {
  const data = await fixture([3]);
  const { createOrder } = await import("../src/service/order");
  const line = { eventId: data.events[0].id, type: "VIP", quantity: 2 };
  await assert.rejects(
    createOrder({ userId: data.order.userId, tickets: [line, line] }),
    /Not enough/,
  );
  for (const quantity of [-1, 0, 0.5, Number.NaN]) {
    await assert.rejects(
      createOrder({
        userId: data.order.userId,
        tickets: [{ ...line, quantity }],
      }),
      /positive integer/,
    );
  }
  await assert.rejects(
    createOrder({
      userId: data.order.userId,
      tickets: [line],
      serviceFee: -19,
    }),
    /cannot be supplied/,
  );
  assert.equal(
    await prisma.ticketReservation.count({
      where: { eventId: data.events[0].id },
    }),
    0,
  );
  const order = await createOrder({
    userId: data.order.userId,
    tickets: [
      { ...line, quantity: 1 },
      { ...line, quantity: 1 },
    ],
  });
  assert.equal(order.tickets.length, 1);
  assert.equal(order.tickets[0].quantity, 2);
  assert.equal(
    order.expiresAt!.getTime() - order.createdAt.getTime(),
    15 * 60 * 1000,
  );
});

test("a multi-event reservation is all-or-nothing", async () => {
  const data = await fixture([5, 0]);
  const { createOrder } = await import("../src/service/order");
  const beforeCount = await prisma.order.count();
  await assert.rejects(
    createOrder({
      userId: data.order.userId,
      tickets: data.events.map((event) => ({
        eventId: event.id,
        type: "VIP",
        quantity: 1,
      })),
    }),
    /Not enough/,
  );
  assert.equal(await prisma.order.count(), beforeCount);
  assert.equal(
    await prisma.ticketReservation.count({
      where: { eventId: { in: data.events.map((event) => event.id) } },
    }),
    0,
  );
});

test("all event views subtract holds, and expired unpaid holds disappear without cleanup", async () => {
  const data = await heldOrder([5], 2);
  const events = await import("../src/service/event");
  const home = await import("../src/service/home");
  const views = [
    (await events.getEvents({ venueId: data.events[0].venueId })).events[0],
    (await events.getUpcomingEvents(1000)).find(
      (event) => event.id === data.events[0].id,
    )!,
    (await events.getTrendingEvents(1000)).find(
      (event) => event.id === data.events[0].id,
    )!,
    (await events.getEventById(data.events[0].id))!,
  ];
  for (const view of views) {
    assert.equal(view.tickets[0].quantity, 3);
    assert.equal(view.tickets[0].reservedQuantity, 2);
    assert.equal(view.venue.ticketsLeft, 3);
  }
  for (const cards of [
    await home.getTrendingEvents(1000),
    await home.getNearByEvents(1000),
  ]) {
    const card = cards.find((item) => item.id === data.events[0].id)!;
    assert.equal(card.availableQuantity, 3);
    assert.equal(card.reservedQuantity, 2);
  }
  await makeExpired(data.order.id);
  assert.equal(
    (await events.getEventById(data.events[0].id))!.availableQuantity,
    5,
  );
  const { activateReservations } = await import("../src/service/reservation");
  await assert.rejects(activateReservations(data.order.id), /expired/);
  const { createOrder } = await import("../src/service/order");
  await createOrder({ ...data.dto, tickets: [{ ...data.dto.tickets[0], quantity: 5 }] });
  assert.equal((await events.getEventById(data.events[0].id))!.availableQuantity, 0);
  assert.equal(
    (
      await prisma.ticketReservation.findFirstOrThrow({
        where: { orderId: data.order.id },
      })
    ).status,
    "HELD",
  );
});

test("concurrent checkout retries reuse one Stripe intent and preserve the original deadline", async (context) => {
  const data = await heldOrder();
  const intents = mockStripeCreation(context);
  const { createPaymentCheckout } = await import("../src/service/payment");
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      createPaymentCheckout({ orderId: data.order.id }),
    ),
  );
  assert.equal(intents.size, 1);
  assert.equal(
    new Set(results.map((result) => result.paymentAttemptId)).size,
    1,
  );
  assert(results.every((result) => result.clientSecret.length > 0));
  assert.equal(
    await prisma.paymentAttempt.count({ where: { orderId: data.order.id } }),
    1,
  );
  assert.equal(
    (
      await prisma.order.findUniqueOrThrow({ where: { id: data.order.id } })
    ).expiresAt!.getTime(),
    data.order.expiresAt!.getTime(),
  );
});

test("payment-active reservations block others after expiry and become sold exactly once", async (context) => {
  const data = await heldOrder([2]);
  mockStripeCreation(context);
  const payment = await import("../src/service/payment");
  await payment.createPaymentCheckout({ orderId: data.order.id });
  const attempt = await prisma.paymentAttempt.findFirstOrThrow({
    where: { orderId: data.order.id },
  });
  await makeExpired(data.order.id);
  const { getEventById } = await import("../src/service/event");
  const { createOrder } = await import("../src/service/order");
  assert.equal((await getEventById(data.events[0].id))!.reservedQuantity, 2);
  const home = await import("../src/service/home");
  assert.equal((await home.getTrendingEvents(1000)).find((card) => card.id === data.events[0].id)!.availabilityLabel, "Reserved");
  await assert.rejects(createOrder(data.dto), /Not enough/);
  await payment.reconcileExpiredPayments();
  assert.equal(
    (
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      })
    ).status,
    "PENDING",
  );
  const event = paymentEvent({ ...data, attempt });
  assert.equal((await deliver(event)).status, 200);
  assert.equal((await deliver(event)).status, 200);
  await expectState({ ...data, attempt }, "SUCCEEDED", [0]);
  assert.equal((await getEventById(data.events[0].id))!.reservedQuantity, 0);
  assert.equal((await home.getTrendingEvents(1000)).find((card) => card.id === data.events[0].id)!.availabilityLabel, "Sold Out");
  assert.equal(
    (
      await prisma.ticketReservation.findFirstOrThrow({
        where: { orderId: data.order.id },
      })
    ).status,
    "CONSUMED",
  );
});

test("uncertain Stripe creation/cancellation protects stock, confirmed cancellation releases it", async (context) => {
  const data = await heldOrder([2]);
  const payment = await import("../src/service/payment");
  const failedCreation = context.mock.method(
    stripe.paymentIntents,
    "create",
    async () => {
      throw new Error("Network timeout");
    },
  );
  await assert.rejects(
    payment.createPaymentCheckout({ orderId: data.order.id }),
    /Unable to start/,
  );
  assert.equal(
    (
      await prisma.ticketReservation.findFirstOrThrow({
        where: { orderId: data.order.id },
      })
    ).status,
    "PAYMENT_ACTIVE",
  );
  failedCreation.mock.restore();
  mockStripeCreation(context);
  await payment.createPaymentCheckout({ orderId: data.order.id });
  const cancellation = context.mock.method(
    stripe.paymentIntents,
    "cancel",
    async () => {
      throw new Error("Network timeout");
    },
  );
  await assert.rejects(
    payment.cancelPayment(data.order.id),
    /remains protected/,
  );
  assert.equal(
    (
      await prisma.ticketReservation.findFirstOrThrow({
        where: { orderId: data.order.id },
      })
    ).status,
    "PAYMENT_ACTIVE",
  );
  cancellation.mock.restore();
  context.mock.method(
    stripe.paymentIntents,
    "cancel",
    async () =>
      ({ status: "canceled" }) as Stripe.Response<Stripe.PaymentIntent>,
  );
  await payment.cancelPayment(data.order.id);
  const { getEventById } = await import("../src/service/event");
  assert.equal((await getEventById(data.events[0].id))!.availableQuantity, 2);
  assert.equal(
    (
      await prisma.ticketReservation.findFirstOrThrow({
        where: { orderId: data.order.id },
      })
    ).status,
    "RELEASED",
  );
});

test("stock editing, event deletion, and arbitrary order changes cannot invalidate a hold", async () => {
  const data = await heldOrder();
  const event = await import("../src/service/event");
  const order = await import("../src/service/order");
  await assert.rejects(
    event.updateEvent(data.events[0].id, {
      tickets: [{ type: "VIP", price: 10, quantity: 0 }],
    }),
    /reserved or sold/,
  );
  await assert.rejects(
    event.deleteEvent(data.events[0].id),
    /referenced by orders/,
  );
  await assert.rejects(
    order.updateOrder(data.order.id, { status: "CONFIRMATION" }),
    /managed by/,
  );
  const { activateReservations } = await import("../src/service/reservation");
  await activateReservations(data.order.id);
  await assert.rejects(order.deleteOrder(data.order.id), /reconcile payment/);
});

test("deleting an unpaid order releases its hold", async () => {
  const data = await heldOrder([2]);
  const { deleteOrder } = await import("../src/service/order");
  await deleteOrder(data.order.id);
  const { getEventById } = await import("../src/service/event");
  assert.equal((await getEventById(data.events[0].id))!.availableQuantity, 2);
});
