import Link from "next/link";

export default function UpgradeCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900 p-4">
      <div className="bg-ink-800 border border-ink-600 rounded-lg p-6 w-full max-w-sm text-center">
        <h1 className="text-base font-semibold text-white mb-2">
          No changes made.
        </h1>
        <p className="text-xs text-ink-200 mb-5 leading-relaxed">
          Your subscription was not started. You can upgrade anytime from the
          editor.
        </p>
        <Link
          href="/"
          className="block w-full text-center rounded-md bg-accent-500 hover:bg-accent-400 text-white font-semibold text-sm py-2.5 transition shadow-[0_0_12px_rgba(239,108,78,0.25)]"
        >
          Go to editor
        </Link>
      </div>
    </div>
  );
}
