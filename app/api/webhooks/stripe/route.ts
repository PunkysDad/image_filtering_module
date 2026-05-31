import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Stripe signature verification needs the raw, unparsed payload. In the App
// Router there is no body parser to disable (the Pages-Router
// `export const config = { api: { bodyParser: false } }` is deprecated and
// errors the build) — we read the raw bytes directly via req.arrayBuffer().
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Service-role Supabase client (same pattern as /api/auth/set-tier): tier
// updates bypass RLS and must run with elevated permissions.
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function tierForPrice(priceId: string | undefined): "basic" | "premium" {
  return priceId === process.env.STRIPE_PREMIUM_PRICE_ID ? "premium" : "basic";
}

export async function POST(req: NextRequest) {
  // 1. Raw body (Buffer) + 2. signature header.
  const rawBody = Buffer.from(await req.arrayBuffer());
  const sig = req.headers.get("stripe-signature");

  // 3. Verify the signature.
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig ?? "",
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    console.log("Webhook verification error:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  const supabase = adminClient();
  const now = new Date().toISOString();

  // 4. Handle the relevant events.
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;

      if (userId && subscriptionId) {
        // Retrieve the subscription to read its status and price.
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const tier = tierForPrice(priceId);

        await supabase
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: subscription.status,
            tier,
            updated_at: now,
          })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      const status = subscription.status;
      const priceId = subscription.items.data[0]?.price.id;
      const tier = tierForPrice(priceId);

      if (userId) {
        if (status === "active" || status === "trialing") {
          await supabase
            .from("profiles")
            .update({
              tier,
              subscription_status: status,
              stripe_subscription_id: subscription.id,
              updated_at: now,
            })
            .eq("id", userId);
        } else if (
          status === "past_due" ||
          status === "canceled" ||
          status === "unpaid"
        ) {
          await supabase
            .from("profiles")
            .update({
              tier: "basic",
              subscription_status: status,
              updated_at: now,
            })
            .eq("id", userId);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      if (userId) {
        await supabase
          .from("profiles")
          .update({
            tier: "basic",
            subscription_status: "canceled",
            updated_at: now,
          })
          .eq("id", userId);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
