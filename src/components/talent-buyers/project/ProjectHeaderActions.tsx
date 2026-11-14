"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { CastingShareDialog } from "@/components/talent-buyers/casting/CastingShareButton";
import { CastingStatusActionButton } from "@/components/talent-buyers/casting/CastingStatusActionButton";
import { isCastingFullyFinalized } from "@/lib/talent-buyers/casting/casting-completion";
import { projectHomePath, projectPath, projectWorkspacePath } from "@/lib/talent-buyers/project-routes";
import type { ProjectWorkspaceData } from "./ProjectWorkspaceContext";

export function ProjectBackButton() {
  return <Link href="/projects" className="bd-btn-secondary project-header-back"><ArrowLeft size={16} aria-hidden /> Back to projects</Link>;
}

/** Chrome renders outside the workspace provider, so receive its data explicitly. */
export function ProjectHeaderActions({ project, castingWorkflow, onSettings, onEditCasting }: Pick<ProjectWorkspaceData, "project" | "castingWorkflow"> & { onSettings: () => void; onEditCasting: () => void }) {
  const router = useRouter();
  const query = useSearchParams();
  const roleQuery = query.get("role") ? `?role=${encodeURIComponent(query.get("role")!)}` : "";
  const [dialog, setDialog] = useState<"share" | "status" | null>(null);
  const owner = project.isOwner !== false;
  const castingAbility = project.composable?.abilities.find((ability) => ability.id === "casting");
  const casting = project.composable ? Boolean(castingAbility && castingAbility.status !== "paused") : project.projectType === "casting";
  const people = !project.composable || project.composable.abilities.some((ability) => ability.id === "roster" && ability.status !== "paused");
  const options = [
    { value: "", label: "Actions", hidden: true },
    ...(casting ? [
      { value: "share", label: "Share casting", group: "Casting" },
      { value: "invite", label: "Invite talent", group: "Casting" },
      { value: "review", label: "Review submissions", group: "Casting" },
      { value: "shortlist", label: "Shortlist & feedback", group: "Casting" },
      ...(owner ? [{ value: "details", label: "Casting details", group: "Casting" }, { value: "edit", label: "Edit casting", group: "Casting" }, { value: "status", label: "Publishing & status", group: "Casting" }] : []),
    ] : owner ? [{ value: "manage", label: castingAbility?.status === "paused" ? "Resume casting…" : "Start casting…", group: "Casting" }] : []),
    ...(owner ? [{ value: "people", label: "Invite people", group: "People" }] : []),
    { value: "confirmations", label: "Manage confirmations", group: "People" },
  ];
  function select(action: string) {
    if (action === "share" || action === "status") { setDialog(action); return; }
    if (action === "edit") { onEditCasting(); return; }
    const routes: Record<string, string> = {
      details: `${projectWorkspacePath(project.id, "breakdown")}?details=1`,
      invite: `${projectWorkspacePath(project.id, "talent-search")}${roleQuery}`,
      review: `${projectWorkspacePath(project.id, "review")}${roleQuery}`,
      shortlist: `${projectWorkspacePath(project.id, "review")}${roleQuery || "?"}${roleQuery ? "&" : ""}stage=shortlisted`,
      manage: projectHomePath(project.id),
      people: people ? `${projectPath(project.id, "roster")}?invite=1` : projectHomePath(project.id),
      confirmations: projectPath(project.id, "coordination"),
    };
    if (routes[action]) router.push(routes[action]);
  }
  return <>
    <ProjectBackButton />
    <FilterSelect triggerProps={{ className: "project-header-actions-trigger" }} actionMenu value="" label="Project actions" options={options} onChange={select} />
    {owner ? <button type="button" className="project-header-icon" onClick={onSettings} aria-label="Project settings" title="Project settings"><Settings size={18} aria-hidden /></button> : null}
    {dialog === "share" ? <CastingShareDialog projectId={project.id} castingWorkflow={castingWorkflow} open onClose={() => setDialog(null)} /> : null}
    <Modal open={dialog === "status"} onClose={() => setDialog(null)} title="Publishing & status" size="sm">
      <p className="mb-5 text-sm">Casting status: {castingWorkflow?.primaryCasting?.status ?? "draft"}</p>
      <CastingStatusActionButton projectId={project.id} status={castingWorkflow?.primaryCasting?.status} finalized={isCastingFullyFinalized(castingWorkflow?.roles ?? [])} />
    </Modal>
  </>;
}
