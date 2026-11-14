# Payments and ticket reservations

The integration uses Stripe PaymentIntents for cards, MongoDB transactions through
Prisma 6, and a recovery worker started by `src/index.ts`. All development and
automated verification should use Stripe test mode.

## Setup

Set `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
and `FRONTEND_URL` on the server. Set `NEXT_PUBLIC_API_URL` and
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` on the client. The API uses HTTP-only login
cookies, so both applications must use compatible hostnames and cookie settings.

After pulling schema changes, run from `server`:

```sh
npx prisma generate
npx prisma db push
npm run dev
```

MongoDB must support transactions (Atlas or a replica set). Synchronize the schema
before starting the worker. Do not reset existing data to work around duplicate
`PaymentAttempt.providerReference` values; reconcile those duplicate records first.
Existing unpaid orders without a reservation deadline require a new checkout.
Orders from stage two retain their frozen totals when resuming.

Assign `User.role = ADMIN` to a chosen development account directly in the database
when testing refunds or event management. Signup and profile updates cannot grant
administrator access. Role checks read the database rather than trusting token claims.

Configure the Stripe webhook URL as `/payments/webhook` and enable:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `payment_intent.processing`
- `refund.created`, `refund.updated`, `refund.failed`

The SDK uses its supported default API version. Use a compatible snapshot version
for the webhook endpoint. Signature verification runs on the original bytes,
before Express JSON parsing. Only verified receipts enter the durable inbox.

## Reservation and pricing rules

Creating an order atomically creates one hold per aggregated event/category line.
All lines share a 15-minute deadline measured from order creation. A checkout
request ID is scoped to the authenticated user and its cart fingerprint: retries
return the same order and never extend its deadline. Changing a cart requires a
new request ID; cancel the existing reservation before replacing an active cart.

Database `Event.tickets[].quantity` means unsold stock. Public event endpoints
subtract unexpired `HELD` reservations and all `PAYMENT_ACTIVE` allocations.
They expose available/reserved counts, and public `quantity` means available stock.
All stock decisions write the shared event revision in the same transaction.
Conflicting transactions retry from a fresh snapshot, including multi-event carts.

Pricing is calculated on the server in integer cents. Ticket prices come from
the event. Add-ons are charged once per order: parking $35, merchandise $55,
and lounge $80. The service fee is 15% of tickets plus add-ons, rounded to cents.
`STAGEFRONT10` gives a 10% discount on that same base, also rounded to cents.
Prices and totals freeze when the reservation is created. Floating dollar fields
remain for existing consumers and legacy orders; new payment/refund calculations
use integer fields. Only USD/card payments are exposed by this client.

The checkout displays the server quote and deadline, stores its order/request IDs
per user/cart in session storage, and resumes after refresh. The browser's Stripe
result is provisional: the confirmation screen requires the server's `confirmed`
flag. The demo QR code, fabricated confirmation number, and unimplemented download
actions were removed. Downstream ticket admission must respect `ticketsValid` and
`ticketsCancelledAt` from the owned order endpoint.

## Recovery and expiry

The payment attempt is persisted before Stripe creation. Every creation retry
uses the same order key and parameters; its client secret is returned only to
the owner. No Stripe calls occur inside retried database transactions.

An unpaid hold stops affecting availability immediately at its deadline. Once
payment starts, the hold remains protected until Stripe confirms success or
cancellation. The worker runs on startup and every 15 seconds, processing bounded
batches with persisted retry times. It recovers missed webhooks, incomplete intent
creation, expired payments, and pending refunds. It does not overlap its own runs;
the database guards and provider idempotency keys also protect concurrent workers.

At expiry, a cancellable intent is cancelled before releasing inventory. A
processing intent or an uncertain network result keeps its allocation. A
cancellation racing success retrieves the actual outcome and fulfills once.
Declines remain retryable within the original deadline. A successful payment that
cannot be fulfilled is recorded, placed in `PAYMENT_REVIEW`, and queued for a
compensation refund. Duplicate successful intents are refunded without cancelling
the original booking.

Stripe can discard idempotency keys after 24 hours. Ambiguous creates older than
23 hours use provider search/listing rather than creating another intent/refund.
If no unique matching object can be identified, the allocation remains protected
for manual reconciliation. Inspect `PaymentAttempt.fulfillmentError`, pending
webhook `lastError`, and `Refund.lastError`; resolve the provider object before
releasing inventory or starting another payment. Amount/currency mismatches also
require investigation and never grant admission.

## Refund API

`POST /payments/refund` requires an administrator and JSON such as:

```json
{
  "paymentAttemptId": "payment-attempt-id",
  "requestId": "a-stable-uuid-for-this-refund",
  "amount": 5,
  "restockTickets": false
}
```

`amount` is a positive dollar amount with at most two decimal places. Omit it to
refund the unallocated balance; zero never means a full refund. Reuse the request
ID when retrying the same operation. Concurrent pending refund allocations count
against the refundable balance. A lost Stripe response leaves a persisted request
for recovery, rather than freeing the balance for another refund.

Partial refunds keep tickets valid and do not return stock. A successful full
refund invalidates the order's tickets. Stock returns exactly once only when
`restockTickets: true` was explicitly requested with the final/full refund. Pending,
failed, and cancelled refunds do not return inventory. A refund on a duplicate
intent affects only that intent, preserving the primary paid booking.

The successful financial refund is committed before attempting the stock return.
If an inventory category needs repair, `Refund.restockPending` and `lastError`
retain that work for the worker to retry. Repairing inventory cannot roll back or
hide an already successful refund, and repeated stock-return attempts cannot
increment inventory more than once.

## Verification

```sh
cd server
npm test
npm run test:typecheck
npx prisma validate
cd ../client
npm run build
```

Tests use an isolated temporary MongoDB replica set with real indexes and
transactions. HTTP tests cover signed webhooks, authentication, ownership, quotes,
and refund administration. Stripe API calls are stubbed and blocked by default;
no external charges/refunds or application database changes occur. A real Stripe
test-card/3-D Secure browser smoke test remains useful after configuring your
development keys and webhook forwarding.
