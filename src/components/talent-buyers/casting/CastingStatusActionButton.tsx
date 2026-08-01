"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  closeCastingFromWorkflow,
  publishCastingFromBreakdown,
} from "@/app/(buyer-app)/(paid)/projects/[id]/casting-workflow/actions";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { useIndustryIdentityGate } from "@/components/talent-buyers/IndustryIdentityGate";
import type { CastingProjectStatus } from "@/lib/talent-buyers/casting/casting-types";
import { isIndustryIdentityRequiredError } from "@/lib/talent-buyers/industry-identity-errors";

export function CastingStatusActionButton({
  projectId,
  status,
}: {
  projectId: string;
  status: CastingProjectStatus | null | undefined;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { runWithIdentity, gate } = useIndustryIdentityGate("publish");
  const isPublished = status === "published" || status === "paused";

  function publish() {
    runWithIdentity(() => {
      startTransition(async () => {
        const result = await publishCastingFromBreakdown(projectId);
        if (!result.ok) {
          showToast({
            message: isIndustryIdentityRequiredError(result)
              ? (result.error ?? "Verify your identity to publish.")
              : (result.error ?? "Publish failed"),
            variant: "error",
          });
          return;
        }
        showToast({ message: "Casting published", variant: "success" });
        router.refresh();
      });
    });
  }

  function close() {
    startTransition(async () => {
      const result = await closeCastingFromWorkflow(projectId);
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not close casting", variant: "error" });
        return;
      }
      showToast({ message: "Casting closed", variant: "success" });
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        className={isPublished ? "buyer-chrome-bar__edit-link" : "buyer-chrome-bar__cta"}
        disabled={isPending}
        onClick={isPublished ? close : publish}
      >
        {isPending ? (isPublished ? "Closing…" : "Publishing…") : isPublished ? "Close" : "Publish"}
      </button>
      {gate}
    </>
  );
}
