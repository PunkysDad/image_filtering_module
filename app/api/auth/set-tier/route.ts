import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Updates a profile's tier using the Supabase service-role (secret) key.
// Tier changes bypass the row-level-security UPDATE policy (which only allows a
// user to touch their own row and never escalate via the publishable key), so
// this must run server-side with elevated permissions.
//
// TODO: When Stripe is implemented, "premium" must only be granted here after a
// verified successful payment — not on signup alone.
export async function POST(req: NextRequest) {
  let body: { userId?: string; tier?: string };
  try {
    body = (await req.json()) as { userId?: string; tier?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, tier } = body;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (tier !== "basic" && tier !== "premium") {
    return NextResponse.json(
      { error: "tier must be 'basic' or 'premium'" },
      { status: 400 },
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await admin
    .from("profiles")
    .update({ tier, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
