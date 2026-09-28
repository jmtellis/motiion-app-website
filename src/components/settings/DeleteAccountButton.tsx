"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ButtonProgress } from "@/components/auth/ButtonProgress";
import { AuthButton } from "@/components/auth/ui";

type DeleteAccountResult = { ok: true } | { ok: false; error: string };

export function DeleteAccountButton({ deleteAccount, profileLabel }: {
  deleteAccount: () => Promise<DeleteAccountResult>;
  profileLabel: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    let result: DeleteAccountResult;
    try {
      result = await deleteAccount();
    } catch {
      setError("We couldn’t delete your account. Please try again.");
      setDeleting(false);
      return;
    }

    if (!result.ok) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    setDeleted(true);
    window.setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1800);
  }

  if (deleted) {
    return (
      <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Your account has been permanently deleted. Redirecting to the homepage…
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-rose-950">Delete your account?</p>
          <p className="text-sm text-rose-900/80">
            This permanently removes your {profileLabel} and account from Motiion. This action
            cannot be undone.
          </p>
        </div>

        {error ? <p role="alert" className="text-sm text-rose-800">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:opacity-60"
            onClick={handleDelete}
            disabled={deleting}
            aria-busy={deleting}
          >
            <ButtonProgress loading={deleting}>Yes, delete my account</ButtonProgress>
          </button>
          <AuthButton
            type="button"
            variant="secondary"
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={deleting}
          >
            Cancel
          </AuthButton>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800"
      onClick={() => setConfirming(true)}
    >
      Delete account
    </button>
  );
}
