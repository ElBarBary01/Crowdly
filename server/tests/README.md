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
it down and removes that directory afterward. It does not read the application's
`.env` or connect to its database. Missing MongoDB executables fail the tests
rather than silently skipping database verification.

Webhook requests go through the real Express application and Stripe signature
verification with local fixture keys. No Stripe API calls or charges are made.
Assertions cover concurrent/replayed deliveries, payment state ordering, and
transaction rollback across multiple events.

Transaction conflicts may return HTTP 500 during simultaneous delivery. The
tests replay those deliveries, as Stripe does, and verify that inventory was
consumed only once.
