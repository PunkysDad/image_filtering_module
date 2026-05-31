import Stripe from "stripe";

// Singleton server-side Stripe client. Pinned to the 2024-06-20 API version.
// The installed SDK's apiVersion type only accepts its own (newer) literal, so
// we suppress that check to keep the requested pinned version — this is the
// approach Stripe's own typings recommend for pinning an older API version.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore - pin to an older API version than the SDK default
  apiVersion: "2024-06-20",
});
