import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Require an authenticated Supabase session.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Read + validate the requested price.
  let body: { priceId?: string };
  try {
    body = (await req.json()) as { priceId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { priceId } = body;
  const basicPriceId = process.env.STRIPE_BASIC_PRICE_ID;
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!priceId || (priceId !== basicPriceId && priceId !== premiumPriceId)) {
    return NextResponse.json({ error: "Invalid priceId" }, { status: 400 });
  }

  // 3. Reuse the existing Stripe customer if the profile has one.
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  // 4. Create the Checkout session.
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade/cancel`,
    metadata: { supabase_user_id: user.id },
    subscription_data: { metadata: { supabase_user_id: user.id } },
  };
  if (profile?.stripe_customer_id) {
    params.customer = profile.stripe_customer_id;
  } else if (user.email) {
    // No customer yet — Stripe auto-creates one from the email.
    params.customer_email = user.email;
  }

  const session = await stripe.checkout.sessions.create(params);

  // 5. Return the hosted Checkout URL.
  return NextResponse.json({ url: session.url });
}
