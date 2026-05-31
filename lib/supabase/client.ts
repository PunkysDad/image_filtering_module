import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Uses the publishable (anon) key only — never
// the secret key. Session is persisted in localStorage by createBrowserClient,
// so it survives across browser sessions automatically.
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
