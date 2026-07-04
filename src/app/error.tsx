"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm opacity-70">
          An unexpected error occurred. Try again, or head back to the home page — we&apos;ve been
          notified.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-current/20 px-4 py-2 text-sm font-semibold"
          >
            Try again
          </button>
          <a href="/" className="rounded-xl border border-current/20 px-4 py-2 text-sm font-semibold">
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
