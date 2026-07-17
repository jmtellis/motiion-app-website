"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cancelIncompleteSignup } from "@/app/onboarding/actions";

import "@/app/signup/signup-split.css";

type SetupFlowCancelButtonProps = {
  userId: string;
  disabled?: boolean;
  onCanceled: () => void;
  onError?: (message: string) => void;
};

export function SetupFlowCancelButton({
  userId,
  disabled = false,
  onCanceled,
  onError,
}: SetupFlowCancelButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setDialogError(null);

    startTransition(async () => {
      const result = await cancelIncompleteSignup();

      if (!result.ok) {
        setDialogError(result.error);
        onError?.(result.error);
        return;
      }

      onCanceled();
      setConfirmOpen(false);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        className="signup-split-nav-btn signup-split-nav-btn--ghost"
        onClick={() => {
          setDialogError(null);
          setConfirmOpen(true);
        }}
        disabled={disabled || isPending}
      >
        {isPending ? "Canceling…" : "Cancel"}
      </button>

      {confirmOpen ? (
        <div className="setup-flow-cancel-dialog" role="presentation">
          <button
            type="button"
            className="setup-flow-cancel-dialog__backdrop"
            aria-label="Close dialog"
            onClick={() => {
              if (!isPending) setConfirmOpen(false);
            }}
          />
          <div
            className="setup-flow-cancel-dialog__panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`setup-flow-cancel-title-${userId}`}
            aria-describedby={`setup-flow-cancel-description-${userId}`}
          >
            <h2 id={`setup-flow-cancel-title-${userId}`} className="setup-flow-cancel-dialog__title">
              Cancel setup?
            </h2>
            <p id={`setup-flow-cancel-description-${userId}`} className="setup-flow-cancel-dialog__description">
              This will delete your account and remove all progress. This can&apos;t be undone.
            </p>
            {dialogError ? <p className="setup-flow-cancel-dialog__error">{dialogError}</p> : null}
            <div className="setup-flow-cancel-dialog__actions">
              <button
                type="button"
                className="signup-split-nav-btn signup-split-nav-btn--ghost"
                onClick={() => setConfirmOpen(false)}
                disabled={isPending}
              >
                Keep setting up
              </button>
              <button
                type="button"
                className="setup-flow-cancel-dialog__confirm"
                onClick={handleConfirm}
                disabled={isPending}
              >
                {isPending ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
