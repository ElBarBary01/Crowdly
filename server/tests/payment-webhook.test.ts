import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { Server } from "node:http";
import { after, before, test, mock } from "node:test";
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
const remoteIntents = new Map<string, Stripe.Response<Stripe.PaymentIntent>>();

before(
  async () => {
    mongo = await startTestMongo();
    process.env.DATABASE_URL = mongo.url;
    process.env.STRIPE_SECRET_KEY = "sk_test_crowdly_local_tests";
    process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
    process.env.RESEND_API_KEY = "re_crowdly_local_tests";
    process.env.JWT_SECRET = "crowdly-local-test-secret";

    ({ default: prisma } = await import("../src/lib/prisma"));
    ({ stripe } = await import("../src/lib/stripe"));
    mock.method(stripe.paymentIntents, "create", async () => {
      throw new Error("Unmocked Stripe create is blocked");
    });
    mock.method(stripe.paymentIntents, "retrieve", async (id: string) => {
      const intent = remoteIntents.get(id);
      if (!intent) throw new Error("No remote payment fixture: " + id);
      return intent;
    });
    mock.method(stripe.paymentIntents, "cancel", async (id: string) => {
      const intent = remoteIntents.get(id);
      if (!intent) throw new Error("No remote payment fixture");
      if (intent.status === "succeeded" || intent.status === "processing")
        throw new Error("Intent cannot be cancelled");
      intent.status = "canceled";
      return intent;
    });
    mock.method(stripe.refunds, "create", async () => {
      throw new Error("Unmocked Stripe refund is blocked");
    });
    mock.method(stripe.refunds, "retrieve", async () => {
      throw new Error("Unmocked Stripe refund retrieval is blocked");
    });
    const { createApp } = await import("../src/app");
    server = createApp().listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert(address && typeof address === "object");
    baseURL = `http://127.0.0.1:${address.port}`;
  },
  { timeout: 60_000 },
);

after(
  async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => (error ? reject(error) : resolve()));
      });
    }
    if (prisma) await prisma.$disconnect();
    await mongo?.stop();
  },
  { timeout: 30_000 },
);

async function fixture(stock = [5]) {
  const user = await prisma.user.create({
    data: {
      name: "Test customer",
      email: `${randomUUID()}@example.test`,
      password: "unused",
    },
  });
  const venue = await prisma.venue.create({
    data: {
      name: "Test venue",
      capacity: 100,
      location: "Test city",
      stageSections: [],
      images: [],
      amenities: [],
      policies: [],
    },
  });
  const events = await Promise.all(
    stock.map((quantity, index) =>
      prisma.event.create({
        data: {
          title: `Test event ${index}`,
          date: new Date(
            `2099-01-${String(index + 1).padStart(2, "0")}T20:00:00Z`,
          ),
          time: "20:00",
          venueId: venue.id,
          genres: [],
          images: [],
          tickets: [{ type: "VIP", price: 10, quantity }],
        },
      }),
    ),
  );
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      status: "PAYMENT",
      paymentStatus: "PENDING",
      totalPrice: 20 * events.length,
      tickets: events.map((event) => ({
        eventId: event.id,
        type: "VIP",
        price: 10,
        quantity: 2,
      })),
      events: events.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        venueId: venue.id,
        venueName: venue.name,
      })),
    },
  });
  const paymentIntentId = `pi_${randomUUID()}`;
  const attempt = await prisma.paymentAttempt.create({
    data: {
      orderId: order.id,
      provider: "STRIPE",
      providerReference: paymentIntentId,
      paymentIntentId,
      amount: order.totalPrice,
      currency: "usd",
      status: "PENDING",
    },
  });
  remoteIntents.set(paymentIntentId, {
    id: paymentIntentId,
    object: "payment_intent",
    status: "requires_payment_method",
    amount: order.totalPrice * 100,
    amount_received: 0,
    currency: "usd",
    metadata: { orderId: order.id },
    last_payment_error: null,
  } as unknown as Stripe.Response<Stripe.PaymentIntent>);
  return { order, attempt, events };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;
type PaymentEventType =
  | "payment_intent.succeeded"
  | "payment_intent.payment_failed"
  | "payment_intent.canceled";

function paymentEvent(
  data: Fixture,
  type: PaymentEventType = "payment_intent.succeeded",
) {
  return {
    id: `evt_${randomUUID()}`,
    object: "event",
    type,
    api_version: "2025-04-30.basil",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: null,
    data: {
      object: {
        id: data.attempt.paymentIntentId,
        object: "payment_intent",
        status:
          type === "payment_intent.succeeded"
            ? "succeeded"
            : type === "payment_intent.canceled"
              ? "canceled"
              : "requires_payment_method",
        amount: Math.round(data.order.totalPrice * 100),
        amount_received:
          type === "payment_intent.succeeded"
            ? Math.round(data.order.totalPrice * 100)
            : 0,
        currency: "usd",
        metadata: { orderId: data.order.id, note: "تذاكر — VIP" },
      },
    },
  };
}

async function deliver(
  event: unknown,
  options: {
    signature?: string | null;
    body?: string;
    contentType?: string;
  } = {},
) {
  const payload = JSON.stringify(event, null, 2);
  const signature =
    options.signature === undefined
      ? stripe.webhooks.generateTestHeaderString({
          payload,
          secret: webhookSecret,
        })
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

async function expectState(
  data: Fixture,
  status: PaymentStatus,
  quantities: number[],
) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: data.order.id },
  });
  const attempt = await prisma.paymentAttempt.findUniqueOrThrow({
    where: { id: data.attempt.id },
  });
  assert.equal(order.paymentStatus, status);
  assert.equal(attempt.status, status);
  assert.equal(
    order.status,
    status === "SUCCEEDED"
      ? "CONFIRMATION"
      : status === "CANCELLED"
        ? "CANCELLED"
        : "PAYMENT",
  );
  for (const [index, event] of data.events.entries()) {
    const stored = await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
    });
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
    payload: JSON.stringify(event, null, 2),
    secret: webhookSecret,
    timestamp: Math.floor(Date.now() / 1000) - 3600,
  });
  for (const options of [
    { signature: null },
    { signature: "invalid" },
    { signature: stale },
    { body: JSON.stringify(event) },
    { contentType: "text/plain" },
    { body: "" },
  ]) {
    assert.equal((await deliver(event, options)).status, 400);
  }
  await expectState(data, "PENDING", [5]);
});

test("unsupported events and PaymentIntents without order metadata are acknowledged without fulfillment", async () => {
  const data = await fixture();
  const event = paymentEvent(data);
  assert.equal(
    (await deliver({ ...event, type: "charge.succeeded" })).status,
    200,
  );
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
  const responses = await Promise.all(
    Array.from({ length: 8 }, () => deliver(event)),
  );
  assert(responses.some((response) => response.status === 200));
  for (const response of responses) {
    assert([200, 500].includes(response.status));
    if (response.status === 500)
      assert.equal((await deliver(event)).status, 200);
  }
  await expectState(data, "SUCCEEDED", [3]);
});

test("a declined intent can later succeed, and late failure/cancellation events cannot undo success", async () => {
  const data = await fixture();
  assert.equal(
    (await deliver(paymentEvent(data, "payment_intent.payment_failed"))).status,
    200,
  );
  await expectState(data, "FAILED", [5]);
  assert.equal((await deliver(paymentEvent(data))).status, 200);
  for (const type of [
    "payment_intent.payment_failed",
    "payment_intent.canceled",
  ] as const) {
    assert.equal((await deliver(paymentEvent(data, type))).status, 200);
  }
  await expectState(data, "SUCCEEDED", [3]);
});

test("a cancellation event changes payment state without consuming inventory", async () => {
  const data = await fixture();
  assert.equal(
    (await deliver(paymentEvent(data, "payment_intent.canceled"))).status,
    200,
  );
  assert.equal(
    (await deliver(paymentEvent(data, "payment_intent.payment_failed"))).status,
    200,
  );
  await expectState(data, "CANCELLED", [5]);
});

test("success is recovered after an earlier local cancellation", async () => {
  const data = await fixture();
  await prisma.paymentAttempt.update({
    where: { id: data.attempt.id },
    data: { status: "CANCELLED" },
  });
  await prisma.order.update({
    where: { id: data.order.id },
    data: { paymentStatus: "CANCELLED" },
  });
  assert.equal((await deliver(paymentEvent(data))).status, 200);
  await expectState(data, "SUCCEEDED", [3]);
});

test("two successful intents for one order are recorded without consuming stock twice", async (context) => {
  context.mock.method(console, "error", () => {});
  const data = await fixture();
  const secondIntent = `pi_${randomUUID()}`;
  const second = await prisma.paymentAttempt.create({
    data: {
      orderId: data.order.id,
      provider: "STRIPE",
      providerReference: secondIntent,
      paymentIntentId: secondIntent,
      amount: data.order.totalPrice,
      currency: "usd",
      status: "PENDING",
    },
  });
  const events = [
    paymentEvent(data),
    paymentEvent({ ...data, attempt: second }),
  ];
  const responses = await Promise.all(events.map((event) => deliver(event)));
  for (const [index, response] of responses.entries()) {
    assert([200, 500].includes(response.status));
    if (response.status === 500)
      assert.equal((await deliver(events[index])).status, 200);
  }
  await expectState(data, "SUCCEEDED", [3]);
  assert.equal(
    (
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: { id: second.id },
      })
    ).status,
    "SUCCEEDED",
  );
});

test("failure on another intent cannot downgrade an already paid order", async () => {
  const data = await fixture();
  assert.equal((await deliver(paymentEvent(data))).status, 200);
  const otherIntent = `pi_${randomUUID()}`;
  const other = await prisma.paymentAttempt.create({
    data: {
      orderId: data.order.id,
      provider: "STRIPE",
      providerReference: otherIntent,
      paymentIntentId: otherIntent,
      amount: data.order.totalPrice,
      currency: "usd",
      status: "PENDING",
    },
  });
  assert.equal(
    (
      await deliver(
        paymentEvent(
          { ...data, attempt: other },
          "payment_intent.payment_failed",
        ),
      )
    ).status,
    200,
  );
  await expectState(data, "SUCCEEDED", [3]);
  assert.equal(
    (await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: other.id } }))
      .status,
    "FAILED",
  );
});

test("amount, received amount, and currency mismatches cannot fulfill an order", async (context) => {
  context.mock.method(console, "error", () => {});
  const data = await fixture();
  for (const mismatch of [
    { amount: 1 },
    { amount_received: 1 },
    { currency: "eur" },
  ]) {
    const event = paymentEvent(data);
    Object.assign(event.data.object, mismatch);
    assert.equal((await deliver(event)).status, 500);
    await expectState(data, "PENDING", [5]);
  }
});

test("an unfulfillable paid order records the charge and queues compensation without consuming any stock", async () => {
  const data = await fixture([5, 0]);
  assert.equal((await deliver(paymentEvent(data))).status, 200);
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: data.order.id } }))
      .status,
    "PAYMENT_REVIEW",
  );
  assert.equal(
    (
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: { id: data.attempt.id },
      })
    ).needsRefund,
    true,
  );
  for (const [index, event] of data.events.entries())
    assert.equal(
      (await prisma.event.findUniqueOrThrow({ where: { id: event.id } }))
        .tickets[0].quantity,
      index === 0 ? 5 : 0,
    );
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
  const data = await fixture();
  const { signToken } = await import("../src/lib/jwt");
  const response = await fetch(`${baseURL}/payments/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "token=" + signToken({ userId: data.order.userId }),
    },
    body: "{}",
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
          object: "payment_intent",
          amount_received: 0,
          last_payment_error: null,
          id,
          client_secret: `${id}_secret`,
          status: "requires_payment_method",
          ...params,
        } as Stripe.Response<Stripe.PaymentIntent>;
        intents.set(options.idempotencyKey, intent);
        remoteIntents.set(intent.id, intent);
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
  await createOrder({
    ...data.dto,
    tickets: [{ ...data.dto.tickets[0], quantity: 5 }],
  });
  assert.equal(
    (await events.getEventById(data.events[0].id))!.availableQuantity,
    0,
  );
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
  assert(results.every((result) => (result.clientSecret?.length ?? 0) > 0));
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
  assert.equal(
    (await home.getTrendingEvents(1000)).find(
      (card) => card.id === data.events[0].id,
    )!.availabilityLabel,
    "Reserved",
  );
  await assert.rejects(createOrder(data.dto), /Not enough/);
  remoteIntents.get(attempt.paymentIntentId!)!.status = "processing";
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
  assert.equal(
    (await home.getTrendingEvents(1000)).find(
      (card) => card.id === data.events[0].id,
    )!.availabilityLabel,
    "Sold Out",
  );
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
      ({
        ...remoteIntents.get(
          (
            await prisma.paymentAttempt.findFirstOrThrow({
              where: { orderId: data.order.id },
            })
          ).paymentIntentId!,
        )!,
        status: "canceled",
      }) as Stripe.Response<Stripe.PaymentIntent>,
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

const remoteRefunds = new Map<string, Stripe.Response<Stripe.Refund>>();
function mockRefunds(
  context: TestContext,
  initialStatus: NonNullable<Stripe.Refund["status"]> = "succeeded",
) {
  const keys = new Map<string, Stripe.Response<Stripe.Refund>>();
  context.mock.method(
    stripe.refunds,
    "create",
    async (
      params: Stripe.RefundCreateParams,
      options?: Stripe.RequestOptions,
    ) => {
      assert(options?.idempotencyKey);
      let refund = keys.get(options.idempotencyKey);
      if (!refund) {
        refund = {
          id: "re_" + randomUUID(),
          object: "refund",
          amount: params.amount!,
          currency: "usd",
          payment_intent: params.payment_intent!,
          metadata: params.metadata ?? {},
          status: initialStatus,
        } as unknown as Stripe.Response<Stripe.Refund>;
        keys.set(options.idempotencyKey, refund);
        remoteRefunds.set(refund.id, refund);
      }
      return refund;
    },
  );
  context.mock.method(stripe.refunds, "retrieve", async (id: string) => {
    const refund = remoteRefunds.get(id);
    assert(refund);
    return refund;
  });
  return keys;
}
async function paidOrder(context: TestContext) {
  const data = await heldOrder();
  mockStripeCreation(context);
  const payment = await import("../src/service/payment");
  const checkout = await payment.createPaymentCheckout({
    orderId: data.order.id,
  });
  const intent = remoteIntents.get(checkout.paymentIntentId)!;
  intent.status = "succeeded";
  intent.amount_received = intent.amount;
  await payment.reconcileOrderPayment(data.order.id);
  const attempt = await prisma.paymentAttempt.findUniqueOrThrow({
    where: { id: checkout.paymentAttemptId },
  });
  return { ...data, attempt, intent };
}
async function apiAs(
  userId: string | null,
  path: string,
  body?: unknown,
  method?: string,
) {
  const { signToken } = await import("../src/lib/jwt");
  return fetch(baseURL + path, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: "token=" + signToken({ userId }) } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("checkout request IDs reserve once under concurrent retries and reject a changed cart", async () => {
  const data = await fixture();
  const { createOrder } = await import("../src/service/order");
  const dto = {
    userId: data.order.userId,
    requestId: randomUUID(),
    tickets: [{ eventId: data.events[0].id, type: "VIP", quantity: 2 }],
  };
  const orders = await Promise.all(
    Array.from({ length: 5 }, () => createOrder(dto)),
  );
  assert.equal(new Set(orders.map((order) => order.id)).size, 1);
  assert.equal(
    await prisma.ticketReservation.count({ where: { orderId: orders[0].id } }),
    1,
  );
  await assert.rejects(
    createOrder({ ...dto, tickets: [{ ...dto.tickets[0], quantity: 1 }] }),
    /different cart/,
  );
  await makeExpired(orders[0].id);
  assert.equal((await createOrder(dto)).id, orders[0].id);
});

test("server pricing includes add-ons, fees, and validated discounts in integer cents", async () => {
  const data = await fixture();
  const cart = {
    tickets: [
      { eventId: data.events[0].id, type: "VIP", quantity: 2, price: 0.01 },
    ],
    addOns: ["parking"],
    promoCode: "STAGEFRONT10",
    requestId: randomUUID(),
  };
  const quote = await apiAs(null, "/payments/quote", cart);
  assert.equal(quote.status, 200);
  const quoted = (await quote.json()).data;
  assert.equal(quoted.subtotalAmount, 2000);
  assert.equal(quoted.addOnAmount, 3500);
  assert.equal(quoted.feeAmount, 825);
  assert.equal(quoted.discountAmount, 550);
  assert.equal(quoted.totalAmount, 5775);
  const response = await apiAs(data.order.userId, "/order", cart);
  assert.equal(response.status, 201);
  assert.equal((await response.json()).data.totalAmount, 5775);
  assert.equal(
    (await apiAs(null, "/payments/quote", { ...cart, promoCode: "FAKE" }))
      .status,
    400,
  );
});

test("reconciliation recovers a missed success webhook and fulfills only once", async (context) => {
  const data = await paidOrder(context);
  await expectState(data, "SUCCEEDED", [3]);
  const { reconcileOrderPayment } = await import("../src/service/payment");
  await reconcileOrderPayment(data.order.id);
  const response = await apiAs(data.order.userId, "/payments/status", {
    orderId: data.order.id,
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.confirmed, true);
  assert.equal(
    (await prisma.event.findUniqueOrThrow({ where: { id: data.events[0].id } }))
      .tickets[0].quantity,
    3,
  );
});

test("expired payment intents are cancelled before their stock becomes available", async (context) => {
  const data = await heldOrder([2]);
  mockStripeCreation(context);
  const payment = await import("../src/service/payment");
  const result = await payment.createPaymentCheckout({
    orderId: data.order.id,
  });
  await makeExpired(data.order.id);
  await payment.reconcileOrderPayment(data.order.id);
  assert.equal(remoteIntents.get(result.paymentIntentId)!.status, "canceled");
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: data.order.id } }))
      .status,
    "EXPIRED",
  );
  assert.equal(
    (
      await prisma.ticketReservation.findFirstOrThrow({
        where: { orderId: data.order.id },
      })
    ).status,
    "RELEASED",
  );
});

test("cancellation racing payment success confirms the sale instead of releasing its tickets", async (context) => {
  const data = await heldOrder([2]);
  mockStripeCreation(context);
  const payment = await import("../src/service/payment");
  const result = await payment.createPaymentCheckout({
    orderId: data.order.id,
  });
  context.mock.method(stripe.paymentIntents, "cancel", async () => {
    const intent = remoteIntents.get(result.paymentIntentId)!;
    intent.status = "succeeded";
    intent.amount_received = intent.amount;
    throw new Error("Already succeeded");
  });
  await payment.cancelPayment(data.order.id);
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: data.order.id } }))
      .status,
    "CONFIRMATION",
  );
  assert.equal(
    (
      await prisma.ticketReservation.findFirstOrThrow({
        where: { orderId: data.order.id },
      })
    ).status,
    "CONSUMED",
  );
});

test("a crash after Stripe creation can be recovered from the prepared attempt using the same key", async (context) => {
  const data = await heldOrder();
  const intents = mockStripeCreation(context);
  const original = stripe.paymentIntents.create.bind(stripe.paymentIntents);
  const crash = context.mock.method(
    stripe.paymentIntents,
    "create",
    async (
      params: Stripe.PaymentIntentCreateParams,
      options?: Stripe.RequestOptions,
    ) => {
      await original(params, options);
      throw new Error("Connection lost after Stripe created the intent");
    },
  );
  const payment = await import("../src/service/payment");
  await assert.rejects(
    payment.createPaymentCheckout({ orderId: data.order.id }),
    /Unable to start/,
  );
  const prepared = await prisma.paymentAttempt.findFirstOrThrow({
    where: { orderId: data.order.id },
  });
  assert.equal(prepared.paymentIntentId, null);
  assert.equal(intents.size, 1);
  crash.mock.restore();
  await makeExpired(data.order.id);
  await payment.reconcileOrderPayment(data.order.id);
  assert.equal(intents.size, 1);
  assert.equal(
    (
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: { id: prepared.id },
      })
    ).status,
    "CANCELLED",
  );
});

test("old ambiguous creates use Stripe search and never recreate after idempotency retention", async (context) => {
  const data = await heldOrder();
  const { activateReservations } = await import("../src/service/reservation");
  await activateReservations(data.order.id);
  await prisma.paymentAttempt.create({
    data: {
      orderId: data.order.id,
      provider: "STRIPE",
      providerReference: "checkout:" + data.order.id,
      amount: data.order.totalPrice,
      currency: "usd",
      status: "PENDING",
      paymentIntentId: null,
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    },
  });
  context.mock.method(
    stripe.paymentIntents,
    "search",
    async () =>
      ({ data: [] }) as unknown as Stripe.Response<
        Stripe.ApiSearchResult<Stripe.PaymentIntent>
      >,
  );
  const creation = context.mock.method(
    stripe.paymentIntents,
    "create",
    async () => {
      throw new Error("Must not create");
    },
  );
  const { reconcileOrderPayment } = await import("../src/service/payment");
  await assert.rejects(
    reconcileOrderPayment(data.order.id),
    /manual reconciliation/,
  );
  assert.equal(creation.mock.callCount(), 0);
  assert.equal(
    (
      await prisma.ticketReservation.findFirstOrThrow({
        where: { orderId: data.order.id },
      })
    ).status,
    "PAYMENT_ACTIVE",
  );
});

test("unprocessed webhook receipts survive failures and a worker finishes them", async (context) => {
  context.mock.method(console, "error", () => {});
  mockRefunds(context);
  const data = await fixture();
  const event = paymentEvent(data);
  await prisma.paymentAttempt.delete({ where: { id: data.attempt.id } });
  assert.equal((await deliver(event)).status, 500);
  assert.equal(
    (
      await prisma.stripeWebhookEvent.findUniqueOrThrow({
        where: { id: event.id },
      })
    ).processedAt,
    null,
  );
  await prisma.paymentAttempt.create({ data: data.attempt });
  await prisma.stripeWebhookEvent.update({
    where: { id: event.id },
    data: { nextAttemptAt: new Date(0) },
  });
  const { runPaymentReconciliation } =
    await import("../src/service/payment-worker");
  await runPaymentReconciliation();
  assert(
    (
      await prisma.stripeWebhookEvent.findUniqueOrThrow({
        where: { id: event.id },
      })
    ).processedAt,
  );
  await expectState(data, "SUCCEEDED", [3]);
});

test("partial then full refunds preserve financial totals and restock only after full success", async (context) => {
  const data = await paidOrder(context);
  const refunds = mockRefunds(context);
  const { processRefund } = await import("../src/service/refund");
  const first = await processRefund({
    paymentAttemptId: data.attempt.id,
    requestId: randomUUID(),
    amount: 5,
  });
  assert.equal(first.status, "SUCCEEDED");
  let order = await prisma.order.findUniqueOrThrow({
    where: { id: data.order.id },
  });
  assert.equal(order.paymentStatus, "PARTIALLY_REFUNDED");
  assert.equal(order.ticketsCancelledAt, null);
  assert.equal(
    (
      await apiAs(order.userId, "/order/" + order.id).then((response) =>
        response.json(),
      )
    ).data.ticketsValid,
    true,
  );
  const requestId = randomUUID();
  await processRefund({
    paymentAttemptId: data.attempt.id,
    requestId,
    restockTickets: true,
  });
  await processRefund({
    paymentAttemptId: data.attempt.id,
    requestId,
    restockTickets: true,
  });
  assert.equal(refunds.size, 2);
  order = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(order.paymentStatus, "REFUNDED");
  assert(order.ticketsCancelledAt);
  assert(order.inventoryReturnedAt);
  assert.equal(
    (
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: { id: data.attempt.id },
      })
    ).refundedAmount,
    data.order.totalAmount,
  );
  assert.equal(
    (await prisma.event.findUniqueOrThrow({ where: { id: data.events[0].id } }))
      .tickets[0].quantity,
    5,
  );
});

test("concurrent refunds cannot allocate more than the paid amount", async (context) => {
  const data = await paidOrder(context);
  const refunds = mockRefunds(context);
  const { processRefund } = await import("../src/service/refund");
  const results = await Promise.allSettled(
    [1, 2].map(() =>
      processRefund({
        paymentAttemptId: data.attempt.id,
        requestId: randomUUID(),
        amount: 15,
      }),
    ),
  );
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal(refunds.size, 1);
  for (const amount of [0, -1, 0.001, Number.NaN])
    await assert.rejects(
      processRefund({
        paymentAttemptId: data.attempt.id,
        requestId: randomUUID(),
        amount,
      }),
    );
});

test("pending and failed refunds do not cancel tickets or return stock; stale events cannot undo success", async (context) => {
  const data = await paidOrder(context);
  const refunds = mockRefunds(context, "pending");
  const refundService = await import("../src/service/refund");
  const first = await refundService.processRefund({
    paymentAttemptId: data.attempt.id,
    requestId: randomUUID(),
    restockTickets: true,
  });
  assert.equal(first.status, "PENDING");
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: data.order.id } }))
      .ticketsCancelledAt,
    null,
  );
  const remote = [...refunds.values()][0];
  remote.status = "failed";
  await refundService.applyStripeRefund(remote);
  const record = await prisma.refund.findUniqueOrThrow({
    where: { id: first.refundRecordId },
  });
  assert.equal(record.status, "FAILED");
  mockRefunds(context);
  const second = await refundService.processRefund({
    paymentAttemptId: data.attempt.id,
    requestId: randomUUID(),
    restockTickets: true,
  });
  const success = remoteRefunds.get(second.refundId!)!;
  await refundService.applyStripeRefund({ ...success, status: "pending" });
  await refundService.applyStripeRefund(success);
  assert.equal(
    (
      await prisma.refund.findUniqueOrThrow({
        where: { id: second.refundRecordId },
      })
    ).status,
    "SUCCEEDED",
  );
  assert.equal(
    (await prisma.event.findUniqueOrThrow({ where: { id: data.events[0].id } }))
      .tickets[0].quantity,
    5,
  );
});

test("an uncertain refund retries the persisted allocation and idempotency key", async (context) => {
  const data = await paidOrder(context);
  const refunds = mockRefunds(context);
  const original = stripe.refunds.create.bind(stripe.refunds);
  const failure = context.mock.method(
    stripe.refunds,
    "create",
    async (
      params: Stripe.RefundCreateParams,
      options?: Stripe.RequestOptions,
    ) => {
      await original(params, options);
      throw new Error("Lost response");
    },
  );
  const service = await import("../src/service/refund");
  const requestId = randomUUID();
  const first = await service.processRefund({
    paymentAttemptId: data.attempt.id,
    requestId,
    amount: 5,
  });
  assert.equal(first.status, "CREATED");
  failure.mock.restore();
  const second = await service.processRefund({
    paymentAttemptId: data.attempt.id,
    requestId,
    amount: 5,
  });
  assert.equal(second.refundRecordId, first.refundRecordId);
  assert.equal(second.status, "SUCCEEDED");
  assert.equal(refunds.size, 1);
});

test("owners, administrators, and anonymous customers have separate payment permissions", async (context) => {
  const owner = await heldOrder();
  const other = await fixture();
  for (const path of [
    "/payments/create",
    "/payments/status",
    "/payments/cancel",
  ]) {
    assert.equal(
      (await apiAs(null, path, { orderId: owner.order.id })).status,
      401,
    );
    assert.equal(
      (await apiAs(other.order.userId, path, { orderId: owner.order.id }))
        .status,
      404,
    );
  }
  assert.equal(
    (await apiAs(other.order.userId, "/order/" + owner.order.id)).status,
    404,
  );
  assert.equal(
    (await apiAs(other.order.userId, "/order/" + owner.order.id, {}, "DELETE"))
      .status,
    404,
  );
  assert.equal(
    (
      await apiAs(other.order.userId, "/payments/refund", {
        paymentAttemptId: owner.attempt.id,
        requestId: randomUUID(),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await apiAs(
        other.order.userId,
        "/event/" + owner.events[0].id,
        { title: "Injected" },
        "PUT",
      )
    ).status,
    403,
  );
  const mine = await apiAs(other.order.userId, "/order").then((response) =>
    response.json(),
  );
  assert(
    mine.data.every(
      (order: { userId: string }) => order.userId === other.order.userId,
    ),
  );
  await apiAs(
    other.order.userId,
    "/user/" + other.order.userId,
    { role: "ADMIN", name: "Still a customer" },
    "PUT",
  );
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: other.order.userId } }))
      .role,
    "USER",
  );
  mockRefunds(context);
  const paid = await paidOrder(context);
  await prisma.user.update({
    where: { id: other.order.userId },
    data: { role: "ADMIN" },
  });
  assert.equal(
    (
      await apiAs(other.order.userId, "/payments/refund", {
        paymentAttemptId: paid.attempt.id,
        requestId: randomUUID(),
        amount: 5,
      })
    ).status,
    200,
  );
});

test("the worker refunds duplicate payments without cancelling the original booking", async (context) => {
  context.mock.method(console, "error", () => {});
  mockRefunds(context);
  const data = await paidOrder(context);
  const intentId = "pi_" + randomUUID();
  const duplicate = await prisma.paymentAttempt.create({
    data: {
      orderId: data.order.id,
      provider: "STRIPE",
      providerReference: intentId,
      paymentIntentId: intentId,
      amount: data.order.totalPrice,
      currency: "usd",
      status: "PENDING",
    },
  });
  assert.equal(
    (await deliver(paymentEvent({ ...data, attempt: duplicate }))).status,
    200,
  );
  assert.equal(
    (
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: { id: duplicate.id },
      })
    ).needsRefund,
    true,
  );
  const { runPaymentReconciliation } =
    await import("../src/service/payment-worker");
  await runPaymentReconciliation();
  assert.equal(
    (
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: { id: duplicate.id },
      })
    ).status,
    "REFUNDED",
  );
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: data.order.id } }))
      .status,
    "CONFIRMATION",
  );
  assert.equal(
    (await prisma.event.findUniqueOrThrow({ where: { id: data.events[0].id } }))
      .tickets[0].quantity,
    3,
  );
});

test("legacy duplicate ticket lines cannot oversell and instead queue a compensation refund", async () => {
  const data = await fixture([1]);
  const line = {
    eventId: data.events[0].id,
    type: "VIP" as const,
    price: 10,
    quantity: 1,
  };
  await prisma.order.update({
    where: { id: data.order.id },
    data: { tickets: [line, line] },
  });
  assert.equal((await deliver(paymentEvent(data))).status, 200);
  assert.equal(
    (
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: { id: data.attempt.id },
      })
    ).needsRefund,
    true,
  );
  assert.equal(
    (await prisma.event.findUniqueOrThrow({ where: { id: data.events[0].id } }))
      .tickets[0].quantity,
    1,
  );
});

test("a missing legacy event does not lose a successful payment or prevent its refund", async (context) => {
  const data = await fixture();
  mockRefunds(context);
  await prisma.event.delete({ where: { id: data.events[0].id } });
  assert.equal((await deliver(paymentEvent(data))).status, 200);
  assert.equal(
    (
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: { id: data.attempt.id },
      })
    ).needsRefund,
    true,
  );
  const { processRefund } = await import("../src/service/refund");
  const result = await processRefund({
    paymentAttemptId: data.attempt.id,
    requestId: randomUUID(),
  });
  assert.equal(result.status, "SUCCEEDED");
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: data.order.id } }))
      .paymentStatus,
    "REFUNDED",
  );
});

test("inventory repair cannot roll back a successful refund and stock return retries exactly once", async (context) => {
  const data = await paidOrder(context);
  mockRefunds(context);
  await prisma.event.update({
    where: { id: data.events[0].id },
    data: { tickets: [] },
  });
  const service = await import("../src/service/refund");
  const result = await service.processRefund({
    paymentAttemptId: data.attempt.id,
    requestId: randomUUID(),
    restockTickets: true,
  });
  assert.equal(result.status, "SUCCEEDED");
  let record = await prisma.refund.findUniqueOrThrow({
    where: { id: result.refundRecordId },
  });
  assert.equal(record.restockPending, true);
  assert(record.lastError);
  assert.equal(
    (await prisma.order.findUniqueOrThrow({ where: { id: data.order.id } }))
      .paymentStatus,
    "REFUNDED",
  );
  await prisma.event.update({
    where: { id: data.events[0].id },
    data: { tickets: [{ type: "VIP", price: 10, quantity: 3 }] },
  });
  await service.retryRestocking(record.id);
  await service.retryRestocking(record.id);
  record = await prisma.refund.findUniqueOrThrow({ where: { id: record.id } });
  assert.equal(record.restockPending, false);
  assert.equal(
    (await prisma.event.findUniqueOrThrow({ where: { id: data.events[0].id } }))
      .tickets[0].quantity,
    5,
  );
});
