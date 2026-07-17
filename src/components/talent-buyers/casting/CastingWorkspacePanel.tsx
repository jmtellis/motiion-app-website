"use client";

import type { CastingWorkspaceTabId } from "@/lib/talent-buyers/casting/casting-types";
import { isCastingWorkspaceRouteValid } from "@/lib/talent-buyers/casting/casting-routes";

import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";

import { CastingBreakdownPanel } from "./CastingBreakdownPanel";
import { CastingCastPanel } from "./CastingCastPanel";
import { CastingClientReviewPanel } from "./CastingClientReviewPanel";
import { CastingReviewPanel } from "./CastingReviewPanel";
import { CastingTalentSearchPanel } from "./CastingTalentSearchPanel";

import "./casting-workspace.css";

export function CastingWorkspacePanel({ workspaceTab }: { workspaceTab: string }) {
  const { project } = useProjectWorkspace();

  if (project.projectType !== "casting") return null;

  const tab = isCastingWorkspaceRouteValid(workspaceTab) ? workspaceTab : "breakdown";

  switch (tab as CastingWorkspaceTabId) {
    case "breakdown":
      return <CastingBreakdownPanel />;
    case "talent-search":
      return <CastingTalentSearchPanel />;
    case "client-review":
      return <CastingClientReviewPanel />;
    case "review":
      return <CastingReviewPanel />;
    case "cast":
      return <CastingCastPanel />;
    default:
      return <CastingBreakdownPanel />;
  }
}
