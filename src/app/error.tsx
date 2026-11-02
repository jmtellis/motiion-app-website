"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function RootError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm opacity-70">
          This page couldn’t be loaded. Try again, or return home to continue.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => { setRetrying(true); window.location.reload(); }}
            disabled={retrying}
            aria-busy={retrying}
            className="ui-button ui-button--secondary min-h-11"
          >
            {retrying ? "Retrying…" : "Try again"}
          </button>
          <Link href="/" className="ui-button ui-button--secondary min-h-11">
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
