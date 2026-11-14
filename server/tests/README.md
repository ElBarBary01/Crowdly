# Server payment tests

Run from `server`:

```sh
npm test
npm run test:typecheck
```

Use Node.js 22 or newer. MongoDB Community Server (`mongod`) and MongoDB Shell
(`mongosh`) must be on PATH. Set `MONGOD_BINARY` and `MONGOSH_BINARY` to executable
paths if they are installed elsewhere.

The suite starts its own single-node replica set on a temporary loopback port,
uses a fresh database in the operating system's temporary directory, and shuts
it down and removes that directory afterward. Prisma schema setup and the test
process receive an explicit temporary database URL, so they never connect to the
application's database. Missing MongoDB executables fail the tests
rather than silently skipping database verification.

Webhook requests go through the real Express application and Stripe signature
verification with local fixture keys. No Stripe API calls or charges are made.
Assertions cover concurrent/replayed deliveries, payment state ordering, and
transaction rollback across multiple events.

Transaction conflicts may return HTTP 500 during simultaneous delivery. The
tests replay those deliveries, as Stripe does, and verify that inventory was
consumed only once.

Reservation tests also cover concurrent claims for the last ticket, aggregated
quantities, multi-event rollback, query-time expiry, and stock protected during
Stripe creation/cancellation failures. Stripe API calls in these tests are
stubbed; inventory and transaction behavior run against the real replica set.

Recovery and refund cases cover prepared intents after a lost response, missed
webhooks, cancellation racing success, persisted receipt retries, partial/full
refunds, refund allocation races, and exactly-once restocking. Permission tests
exercise anonymous, owner, other-customer, and administrator HTTP requests. Stripe
creation/retrieval/refund calls are blocked unless a test explicitly supplies a
fixture, keeping these checks independent of external accounts.
