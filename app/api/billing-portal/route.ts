import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // 1. Require an authenticated Supabase session.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. The user must already have a Stripe customer (i.e. an active/past subscription).
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 400 },
    );
  }

  // 3. Create a Billing Portal session.
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}`,
  });

  // 4. Return the portal URL.
  return NextResponse.json({ url: portalSession.url });
}
