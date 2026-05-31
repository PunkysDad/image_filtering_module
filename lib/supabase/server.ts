import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client for Server Components / Route Handlers. Reads and
// writes the session via the request cookie store so SSR has access to the
// authenticated user. Uses the publishable (anon) key — privileged operations
// must use the service-role client (see app/api/auth/set-tier/route.ts).
export const createClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies are read-only — safe
            // to ignore because the middleware refreshes the session cookie.
          }
        },
      },
    },
  );
};
