"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { publishCastingFromBreakdown } from "@/app/(buyer-app)/(paid)/projects/[id]/casting-workflow/actions";
import {
  deriveCastingWorkflowState,
  getCastingPanelHeader,
  getCastingPrimaryAction,
} from "@/lib/talent-buyers/casting/casting-navigation";
import { enrichRolesWithCounts } from "@/lib/talent-buyers/casting/casting-metrics";
import {
  buildCastingBreakdownDocument,
  castingConfigurationToComposerForm,
} from "@/lib/talent-buyers/casting/casting-breakdown-document";

import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { CreateCastingModal } from "@/components/talent-buyers/project/CreateCastingModal";
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";

import { CastingBreakdownDocumentView } from "./CastingBreakdownDocumentView";
import { CastingPanelHeader } from "./CastingPanelHeader";

export function CastingBreakdownPanel() {
  const router = useRouter();
  const { showToast } = useToast();
  const { projectId, castingWorkflow } = useProjectWorkspace();
  const [castingOpen, setCastingOpen] = useState(false);
  const [, startTransition] = useTransition();

  const workflow = castingWorkflow ?? {
    primaryCasting: null,
    roles: [],
    candidates: [],
    invitations: [],
    referrals: [],
    externalCandidates: [],
    evaluations: [],
  };

  const state = deriveCastingWorkflowState(workflow);
  const header = getCastingPanelHeader("breakdown");
  const primaryAction = getCastingPrimaryAction("breakdown", state);
  const roles = enrichRolesWithCounts(workflow.roles, workflow.candidates);
  const casting = workflow.primaryCasting;
  const breakdownForm = casting
    ? castingConfigurationToComposerForm(
        projectId,
        {
          id: casting.id,
          title: casting.title,
          description: casting.description,
          visibility: casting.visibility,
          location: casting.location,
          configuration: (casting.configuration as import("@/types/casting").CastingConfiguration | undefined) ?? undefined,
        },
        workflow.roles.map((role) => ({
          clientId: role.id,
          id: role.id,
          title: role.name,
          description: role.description ?? "",
          ageRangeMin: role.ageRange?.min != null ? String(role.ageRange.min) : "",
          ageRangeMax: role.ageRange?.max != null ? String(role.ageRange.max) : "",
          gender: "",
          ethnicityPreferences: role.ethnicityPreferences ?? [],
          specialSkills: role.specialSkills ?? role.danceStyles ?? [],
          heightMin: role.heightMinDisplay ?? (role.heightRange?.min != null ? String(role.heightRange.min) : ""),
          heightMax: role.heightMaxDisplay ?? (role.heightRange?.max != null ? String(role.heightRange.max) : ""),
          agencyRequired: false,
          unionStatus: role.unionRequirement ?? "",
          peopleNeeded: String(role.quantityNeeded ?? 1),
          visibility: "public",
          password: "",
          cardColorPreset: "midnight",
          coverImageUrl: "",
          clientMatchFilters: null,
        })),
      )
    : null;
  const breakdownDocument =
    breakdownForm && casting ? buildCastingBreakdownDocument(breakdownForm, casting, roles, projectId) : null;

  function handlePrimaryAction(actionId: string) {
    if (actionId === "publish-casting" || actionId === "reopen-casting") {
      startTransition(async () => {
        const result = await publishCastingFromBreakdown(projectId);
        if (!result.ok) {
          showToast({ message: result.error ?? "Publish failed", variant: "error" });
          return;
        }
        showToast({ message: "Casting published", variant: "success" });
        router.refresh();
      });
      return;
    }
    if (actionId === "preview-casting" && roles[0]?.bridgedRoleId) {
      window.open(`/casting/${roles[0].bridgedRoleId}`, "_blank");
      return;
    }
    setCastingOpen(true);
  }

  if (!casting) {
    return (
      <>
        <CastingPanelHeader {...header} primaryAction={{ label: "Create breakdown", actionId: "create" }} onPrimaryAction={() => setCastingOpen(true)} />
        <div className="project-workspace__panel-body">
          <EmptyState
            variant="dashboard"
            title="No breakdown yet"
            description="Define the casting details, roles, requirements, and submission process."
            actionLabel="Create breakdown"
            onAction={() => setCastingOpen(true)}
          />
        </div>
        <CreateCastingModal projectId={projectId} open={castingOpen} onClose={() => setCastingOpen(false)} />
      </>
    );
  }

  return (
    <>
      <CastingPanelHeader
        {...header}
        primaryAction={primaryAction}
        onPrimaryAction={handlePrimaryAction}
        overflowActions={
          <Link href={`/projects/${projectId}/castings/${casting.id}/edit`} className="bd-btn-secondary text-sm">
            Edit breakdown
          </Link>
        }
      />

      <div className="project-workspace__panel-body casting-breakdown">
        {breakdownDocument ? <CastingBreakdownDocumentView document={breakdownDocument} /> : null}
      </div>

      <CreateCastingModal
        projectId={projectId}
        open={castingOpen}
        onClose={() => {
          setCastingOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
