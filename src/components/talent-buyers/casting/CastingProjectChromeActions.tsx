"use client";

import { CastingStatusActionButton } from "@/components/talent-buyers/casting/CastingStatusActionButton";
import type { CastingProjectStatus } from "@/lib/talent-buyers/casting/casting-types";

export function CastingProjectChromeActions({
  projectId,
  status,
  onEditProject,
}: {
  projectId: string;
  status: CastingProjectStatus | null | undefined;
  onEditProject: () => void;
}) {
  return (
    <>
      <button type="button" className="buyer-chrome-bar__edit-link" onClick={onEditProject}>
        Edit Project
      </button>
      <CastingStatusActionButton projectId={projectId} status={status} />
    </>
  );
}
