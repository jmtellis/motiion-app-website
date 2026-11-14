"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { CastingRolesGrid } from "./CastingRolesGrid";
import { findWorkspaceRole } from "@/lib/talent-buyers/casting/role-workspace";

import type { CastingWorkspaceTabId } from "@/lib/talent-buyers/casting/casting-types";
import { isCastingWorkspaceRouteValid } from "@/lib/talent-buyers/casting/casting-routes";

import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";

const CastingBreakdownPanel = dynamic(() => import("./CastingBreakdownPanel").then((module) => module.CastingBreakdownPanel), { loading: () => <p className="ui-state" role="status">Loading workspace…</p> });
const CastingCastPanel = dynamic(() => import("./CastingCastPanel").then((module) => module.CastingCastPanel), { loading: () => <p className="ui-state" role="status">Loading workspace…</p> });
const CastingClientReviewPanel = dynamic(() => import("./CastingClientReviewPanel").then((module) => module.CastingClientReviewPanel), { loading: () => <p className="ui-state" role="status">Loading workspace…</p> });
const CastingReviewPanel = dynamic(() => import("./CastingReviewPanel").then((module) => module.CastingReviewPanel), { loading: () => <p className="ui-state" role="status">Loading workspace…</p> });
const CastingTalentSearchPanel = dynamic(() => import("./CastingTalentSearchPanel").then((module) => module.CastingTalentSearchPanel), { loading: () => <p className="ui-state" role="status">Loading workspace…</p> });

import "./casting-workspace.css";

export function CastingWorkspacePanel({ workspaceTab }: { workspaceTab: string }) {
  const { project, castingWorkflow } = useProjectWorkspace();
  const query = useSearchParams();
  const role = findWorkspaceRole(castingWorkflow?.roles ?? [], query.get("role"));

  if (project.projectType !== "casting") return null;

  const tab = isCastingWorkspaceRouteValid(workspaceTab) ? workspaceTab : "breakdown";

  // Project entry shows roles. Legacy deep links can still open the full breakdown explicitly.
  if (tab === "breakdown" && query.get("details") === "1") return <CastingBreakdownPanel />;
  if (!role || tab === "breakdown") return <CastingRolesGrid destination={tab as CastingWorkspaceTabId} />;
  switch (tab as CastingWorkspaceTabId) {
    case "breakdown":
      return <CastingBreakdownPanel />;
    case "talent-search":
      return <CastingTalentSearchPanel roleScoped />;
    case "client-review":
      return <CastingClientReviewPanel roleScoped />;
    case "review":
      return <CastingReviewPanel key={`${role.id}:${query.get("stage") ?? "submitted"}`} roleScoped mode={query.get("stage") === "shortlisted" ? "shortlist" : "review"} />;
    case "cast":
      return <CastingCastPanel roleScoped />;
    default:
      return <CastingBreakdownPanel />;
  }
}
