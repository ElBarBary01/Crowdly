import Stripe from "stripe";

// Stripe client singleton.
// Initialized with STRIPE_SECRET_KEY from the environment.

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set. Provide it in the server .env file.",
  );
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-04-30.basil" as Stripe.LatestApiVersion,
});
