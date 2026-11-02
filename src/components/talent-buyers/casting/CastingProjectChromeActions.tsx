"use client";

import { CastingStatusActionButton } from "@/components/talent-buyers/casting/CastingStatusActionButton";
import type { CastingProjectStatus } from "@/lib/talent-buyers/casting/casting-types";

export function CastingProjectChromeActions({
  projectId,
  status,
  finalized,
  onEditProject,
}: {
  projectId: string;
  status: CastingProjectStatus | null | undefined;
  finalized?: boolean;
  onEditProject: () => void;
}) {
  return (
    <>
      <button type="button" className="buyer-chrome-bar__edit-link" onClick={onEditProject}>
        Edit Project
      </button>
      <CastingStatusActionButton projectId={projectId} status={status} finalized={finalized} />
    </>
  );
}
