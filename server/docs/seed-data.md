# Development seed data

From `server`, install dependencies and prepare the database if needed:

```sh
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

For an already configured database, run only `npm run db:seed`.
The seed reads `DATABASE_URL` from `server/.env` (an existing environment variable
takes precedence). MongoDB must support transactions, such as Atlas or a local
replica set. The seed refuses to run when `NODE_ENV=production`.

## Included data

- Two email-verified accounts with bcrypt password hashes.
- Three fictional venues in Cairo, Alexandria, and Giza, covering theater,
  concert stage, and stadium layouts with sections for all four ticket categories.
- Eight fictional artists and twelve linked events covering all eight genres.
- USD ticket prices, descriptions, venue amenities and policies, and remote
  Unsplash images (an internet connection is needed to display the photos).
- Upcoming dates seven to fifty days after the first seed run, plus normal,
  few-tickets-left, and sold-out availability examples.

| Account | Email | Default password |
| --- | --- | --- |
| Customer | `demo@crowdly.test` | `CrowdlyDemo123!` |
| Administrator | `admin@crowdly.test` | `CrowdlyDemo123!` |

Optionally set `SEED_PASSWORD` in `server/.env` before the first run to use a
different password for both accounts. No verification email is required.

## Rerunning

The seed uses stable catalog IDs and account emails. It creates missing records
without deleting data or updating existing records. This preserves changed
passwords, account roles, event dates, ticket stock, and unrelated application
data. Setting `SEED_PASSWORD` on a later run does not reset existing passwords.
Dates are assigned only when an event is created, so rerunning does not move
existing events back into the future. Missing artist-event links are restored.

Orders, reservations, payments, refunds, and webhook records are created through
the normal checkout flow. The seed does not call Stripe or send email.

## Validation

```sh
npm run db:seed:typecheck
node --import tsx --test tests/seed.test.ts
```

The integration test uses its own temporary MongoDB replica set, independent of
`server/.env`. It requires `mongod` and `mongosh` on PATH, as described in
[the test README](../tests/README.md).
