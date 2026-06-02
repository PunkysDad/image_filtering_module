import Link from "next/link";

export default function UpgradeSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900 p-4">
      <div className="bg-ink-800 border border-ink-600 rounded-lg p-6 w-full max-w-sm text-center">
        <h1 className="text-base font-semibold text-white mb-2">
          You&apos;re all set!
        </h1>
        <p className="text-xs text-ink-200 mb-5 leading-relaxed">
          Your subscription is active. You now have access to all Premium
          features.
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
