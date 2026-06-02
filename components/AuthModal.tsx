"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export function preservePendingLayers() {
  // If picmagiq_pending_layers was written by the export gate, re-write it
  // immediately before any Stripe redirect so it survives the full OAuth +
  // Stripe round-trip. This is a no-op if the key is absent.
  try {
    const existing = localStorage.getItem("picmagiq_pending_layers");
    if (existing) {
      localStorage.setItem("picmagiq_pending_layers", existing);
    }
  } catch {}
}

export type AuthMode =
  | "sign-up-prompt"
  | "sign-in"
  | "sign-up-basic"
  | "sign-up-premium"
  | "pro-required"
  | "reset-password"
  | "reset-sent"
  // Shown after signup when email confirmation is required (user, no session).
  | "confirm-email"
  // Authenticated Basic user who clicked Export while Pro layers are active.
  | "export-blocked";

type Props = {
  initialMode: AuthMode;
  hasProLayers: boolean;
  onClose: () => void;
  // Called when auth (or an in-modal upgrade) succeeds so the caller can
  // resume the export that triggered the flow.
  onAuthSuccess: () => void;
};

export default function AuthModal({
  initialMode,
  hasProLayers,
  onClose,
  onAuthSuccess,
}: Props) {
  const { supabase } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetFields = () => {
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };
  const go = (next: AuthMode) => {
    resetFields();
    setMode(next);
  };

  // ---------- auth actions ----------

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    onAuthSuccess();
  };

  const signUpBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) return setError(error.message);

    // Store intent for after email confirmation callback
    try {
      localStorage.setItem("picmagiq_signup_intent", "basic");
      if (data.user?.id) {
        localStorage.setItem("picmagiq_signup_uid", data.user.id);
      }
    } catch {}

    if (data.session) {
      // Immediate session (email confirmation not required) — go straight to Checkout
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID,
        }),
      });
      const { url } = await res.json();
      preservePendingLayers();
      if (url) window.location.href = url;
    } else {
      // Email confirmation required — show confirmation message
      go("confirm-email");
    }
  };

  const signUpPremium = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    // Premium tier is granted by the Stripe webhook after a successful payment,
    // so send the new user straight to Stripe Checkout (whether the session is
    // immediate or email confirmation is required).
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
      }),
    });
    const { url } = await res.json();
    preservePendingLayers();
    if (url) window.location.href = url;
    setBusy(false);
  };

  const signInWithGoogle = async (intent?: "basic" | "premium") => {
    setError(null);
    if (intent === "premium") {
      try {
        localStorage.setItem("picmagiq_oauth_intent", "premium");
      } catch {}
    } else if (intent === "basic") {
      try {
        localStorage.setItem("picmagiq_oauth_intent", "basic");
      } catch {}
    } else {
      try {
        localStorage.removeItem("picmagiq_oauth_intent");
      } catch {}
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/reset",
    });
    setBusy(false);
    if (error) return setError(error.message);
    go("reset-sent");
  };

  // Upgrade an already-authenticated Basic user to Premium via Stripe Checkout.
  // Tier is granted by the webhook once payment succeeds.
  const upgradeToPremium = async () => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
        }),
      });
      const { url } = await res.json();
      preservePendingLayers();
      if (url) window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
    }
  };

  // ---------- shared bits ----------

  const fieldClass =
    "w-full bg-ink-700 border border-ink-600 rounded-md text-sm text-ink-100 px-2 py-1.5 focus:outline-none focus:border-accent-500";
  const primaryBtn =
    "w-full rounded-md bg-accent-500 hover:bg-accent-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 transition shadow-[0_0_12px_rgba(239,108,78,0.25)]";
  const linkBtn = "text-xs text-accent-400 hover:text-accent-300 transition";

  const EmailPasswordFields = (
    <>
      <div>
        <label className="text-xs text-ink-200 block mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label className="text-xs text-ink-200 block mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          required
        />
      </div>
    </>
  );

  // Signup-only — rendered in the sign-up-basic and sign-up-premium forms only.
  const ConfirmPasswordField = (
    <div>
      <label className="text-xs text-ink-200 block mb-1">Confirm Password</label>
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className={fieldClass}
        placeholder="Confirm your password"
        autoComplete="new-password"
        required
      />
    </div>
  );

  function PlanOption({
    title,
    price,
    blurb,
    recommended,
    warning,
    onClick,
  }: {
    title: string;
    price: string;
    blurb: string;
    recommended?: boolean;
    warning?: string;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          "flex-1 text-left rounded-md border px-3 py-3 transition",
          recommended
            ? "border-accent-500 bg-ink-700"
            : "border-ink-600 bg-ink-700/60 hover:border-ink-400",
        ].join(" ")}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-ink-100">{title}</span>
          {recommended && (
            <span className="rounded-sm bg-accent-500 text-ink-900 text-[9px] font-bold tracking-wider px-1 py-px leading-none">
              BEST
            </span>
          )}
        </div>
        <div className="text-xs text-ink-100 font-medium">{price}</div>
        <div className="text-[11px] text-ink-200 mt-1 leading-snug">{blurb}</div>
        {warning && (
          <div className="text-[11px] text-accent-400 mt-2 leading-snug">{warning}</div>
        )}
      </button>
    );
  }

  // ---------- content per mode ----------

  let content: React.ReactNode;

  if (mode === "sign-up-prompt") {
    content = (
      <>
        <h2 className="text-base font-semibold text-white">Export your image</h2>
        <p className="text-xs text-ink-200 mt-1 mb-4">
          Create a free account to export your work
        </p>
        <div className="flex gap-2">
          <PlanOption
            title="Basic"
            price="$19.99/mo"
            blurb="Filters and editing tools"
            warning={hasProLayers ? "⚠ Your current image uses Pro features" : undefined}
            onClick={() => go(hasProLayers ? "pro-required" : "sign-up-basic")}
          />
          <PlanOption
            title="Premium"
            price="$29.99/mo"
            blurb="Everything in Basic, plus Pro filters, Split Tone, Focal Blur, Composite workspace, and AI Assistant"
            recommended
            onClick={() => go("sign-up-premium")}
          />
        </div>
        <p className="text-xs text-ink-200 mt-4 text-center">
          Already have an account?{" "}
          <button type="button" className={linkBtn} onClick={() => go("sign-in")}>
            Sign in to existing account
          </button>
        </p>
      </>
    );
  } else if (mode === "pro-required") {
    content = (
      <>
        <h2 className="text-base font-semibold text-white">Pro features detected</h2>
        <p className="text-xs text-ink-200 mt-2 leading-relaxed">
          Your current image uses Pro filters that are not available on the Basic
          plan. You can still sign up for Basic, but this image cannot be exported
          until Pro layers are removed.
        </p>
        <div className="mt-5 space-y-2">
          <button type="button" className={primaryBtn} onClick={() => go("sign-up-premium")}>
            Choose Premium instead
          </button>
          <button
            type="button"
            onClick={() => go("sign-up-basic")}
            className="w-full rounded-md border border-ink-600 bg-ink-700/60 hover:border-ink-400 text-ink-100 text-sm py-2.5 transition"
          >
            Continue with Basic
          </button>
        </div>
      </>
    );
  } else if (mode === "sign-up-basic") {
    content = (
      <>
        <h2 className="text-base font-semibold text-white">Create your Basic account</h2>
        <p className="text-xs text-ink-200 mt-1 mb-4">Basic — $19.99/mo</p>
        <button
          type="button"
          onClick={() => signInWithGoogle("basic")}
          className="w-full mt-2 rounded-md border border-ink-600 bg-ink-700/60 hover:border-ink-400 text-ink-100 text-sm py-2.5 transition"
        >
          Continue with Google
        </button>
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-ink-600" />
          <span className="text-ink-400 text-xs">or</span>
          <div className="flex-1 h-px bg-ink-600" />
        </div>
        <form onSubmit={signUpBasic} className="space-y-3">
          {EmailPasswordFields}
          {ConfirmPasswordField}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="text-xs text-ink-200 mt-4 text-center">
          Already have an account?{" "}
          <button type="button" className={linkBtn} onClick={() => go("sign-in")}>
            Sign in
          </button>
        </p>
      </>
    );
  } else if (mode === "sign-up-premium") {
    content = (
      <>
        <h2 className="text-base font-semibold text-white">Create your Premium account</h2>
        <p className="text-xs text-ink-200 mt-1 mb-4">Premium — $29.99/mo</p>
        <button
          type="button"
          onClick={() => signInWithGoogle("premium")}
          className="w-full mt-2 rounded-md border border-ink-600 bg-ink-700/60 hover:border-ink-400 text-ink-100 text-sm py-2.5 transition"
        >
          Continue with Google
        </button>
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-ink-600" />
          <span className="text-ink-400 text-xs">or</span>
          <div className="flex-1 h-px bg-ink-600" />
        </div>
        <form onSubmit={signUpPremium} className="space-y-3">
          {EmailPasswordFields}
          {ConfirmPasswordField}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="text-xs text-ink-200 mt-4 text-center">
          Already have an account?{" "}
          <button type="button" className={linkBtn} onClick={() => go("sign-in")}>
            Sign in
          </button>
        </p>
      </>
    );
  } else if (mode === "sign-in") {
    content = (
      <>
        <h2 className="text-base font-semibold text-white">Sign in</h2>
        <form onSubmit={signIn} className="space-y-3 mt-4">
          {EmailPasswordFields}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="w-full mt-2 rounded-md border border-ink-600 bg-ink-700/60 hover:border-ink-400 text-ink-100 text-sm py-2.5 transition"
        >
          Continue with Google
        </button>
        <div className="flex items-center justify-between mt-4">
          <button type="button" className={linkBtn} onClick={() => go("reset-password")}>
            Forgot password?
          </button>
          <button type="button" className={linkBtn} onClick={() => go("sign-up-prompt")}>
            Don&apos;t have an account?
          </button>
        </div>
      </>
    );
  } else if (mode === "reset-password") {
    content = (
      <>
        <h2 className="text-base font-semibold text-white">Reset your password</h2>
        <p className="text-xs text-ink-200 mt-1 mb-4">
          We&apos;ll email you a link to set a new password.
        </p>
        <form onSubmit={sendReset} className="space-y-3">
          <div>
            <label className="text-xs text-ink-200 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
              autoComplete="email"
              required
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="text-xs text-ink-200 mt-4 text-center">
          <button type="button" className={linkBtn} onClick={() => go("sign-in")}>
            Back to sign in
          </button>
        </p>
      </>
    );
  } else if (mode === "reset-sent") {
    content = (
      <>
        <h2 className="text-base font-semibold text-white">Check your email</h2>
        <p className="text-xs text-ink-200 mt-2 leading-relaxed">
          Check your email for a password reset link.
        </p>
        <p className="text-xs text-ink-200 mt-4 text-center">
          <button type="button" className={linkBtn} onClick={() => go("sign-in")}>
            Back to sign in
          </button>
        </p>
      </>
    );
  } else if (mode === "confirm-email") {
    content = (
      <>
        <h2 className="text-base font-semibold text-white">Check your email</h2>
        <p className="text-xs text-ink-200 mt-2 leading-relaxed">
          We sent a confirmation link to {email}. Click the link to verify your
          account and complete signup.
        </p>
        <p className="text-xs text-ink-200 mt-4 text-center">
          <button type="button" className={linkBtn} onClick={() => go("sign-in")}>
            Back to sign in
          </button>
        </p>
      </>
    );
  } else {
    // export-blocked — authenticated Basic user with Pro layers active.
    content = (
      <>
        <h2 className="text-base font-semibold text-white">Pro features detected</h2>
        <p className="text-xs text-ink-200 mt-2 leading-relaxed">
          Your current image uses Pro filters that are not available on the Basic
          plan, so it cannot be exported. Upgrade to Premium, or remove the Pro
          layers and try again.
        </p>
        <div className="mt-5 space-y-2">
          <button type="button" disabled={busy} className={primaryBtn} onClick={upgradeToPremium}>
            {busy ? "Upgrading…" : "Upgrade to Premium"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border border-ink-600 bg-ink-700/60 hover:border-ink-400 text-ink-100 text-sm py-2.5 transition"
          >
            Close
          </button>
        </div>
      </>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-ink-800 border border-ink-600 rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-ink-200 hover:text-white transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {content}
      </div>
    </div>
  );
}
