"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Handles the password-reset redirect from the Supabase email link. When the
// user lands here from the email, Supabase has already established a recovery
// session via the URL hash (the browser client picks it up automatically), so
// updateUser({ password }) can set the new password directly.
export default function ResetPasswordPage() {
  const [supabase] = useState(() => createClient());
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900 p-4">
      <div className="bg-ink-800 border border-ink-600 rounded-lg p-6 w-full max-w-sm">
        <h1 className="text-base font-semibold text-white mb-1">
          {done ? "Password updated" : "Set a new password"}
        </h1>

        {done ? (
          <>
            <p className="text-xs text-ink-200 mb-5">
              Password updated — you can now sign in.
            </p>
            <Link
              href="/"
              className="block w-full text-center rounded-md bg-accent-500 hover:bg-accent-400 text-white font-semibold text-sm py-2.5 transition shadow-[0_0_12px_rgba(239,108,78,0.25)]"
            >
              Back to app
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-ink-200 block mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-ink-700 border border-ink-600 rounded-md text-sm text-ink-100 px-2 py-1.5 focus:outline-none focus:border-accent-500"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-xs text-ink-200 block mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-ink-700 border border-ink-600 rounded-md text-sm text-ink-100 px-2 py-1.5 focus:outline-none focus:border-accent-500"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-accent-500 hover:bg-accent-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 transition shadow-[0_0_12px_rgba(239,108,78,0.25)]"
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
