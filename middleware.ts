import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Refreshes the auth session on every (non-static) request.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks/stripe|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
