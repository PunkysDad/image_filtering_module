"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  email: string;
  tier: "basic" | "premium";
  created_at: string;
  updated_at: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isPremium: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  // Shared client so the AuthModal's sign-in/sign-up calls run on the same
  // instance the provider listens to (keeps onAuthStateChange in sync).
  supabase: SupabaseClient;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(
    async (uid: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();
      setProfile((data as Profile | null) ?? null);
    },
    [supabase],
  );

  useEffect(() => {
    let active = true;

    // Initial session (persisted in localStorage by the browser client).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => {
          if (active) setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // React to sign-in / sign-out / token refresh.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    // Fall back to getUser() so this works immediately after signup, before the
    // onAuthStateChange listener has populated `user` in state.
    const uid = user?.id ?? (await supabase.auth.getUser()).data.user?.id;
    if (uid) await fetchProfile(uid);
  }, [user, fetchProfile, supabase]);

  const isPremium = profile?.tier === "premium";

  return (
    <AuthContext.Provider
      value={{ user, profile, isLoading, isPremium, signOut, refreshProfile, supabase }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
