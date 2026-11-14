"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useProjectWorkspace } from "../project/ProjectWorkspaceContext";
import { RosterStack } from "../project/composable/RosterStackTile";
import { EmptyState } from "../dashboard/EmptyState";
import { CastingRoleEditor } from "./CastingRoleEditor";
import { roleWorkspaceHref } from "@/lib/talent-buyers/casting/role-workspace";
import type { CastingWorkspaceTabId } from "@/lib/talent-buyers/casting/casting-types";
import "../project/composable/composable-project.css";

export function CastingRolesGrid({ destination = "review" }: { destination?: CastingWorkspaceTabId }) {
  const { projectId, project, castingWorkflow } = useProjectWorkspace();
  const query = useSearchParams();
  const [adding, setAdding] = useState(false);
  const roles = castingWorkflow?.roles ?? [];
  const canEdit = project.isOwner !== false;
  return <div className="project-workspace__panel-body casting-roles-home">
    {canEdit && roles.length > 0 ? <div className="casting-roles-home__actions"><button className="bd-btn-secondary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden /> Add role</button></div> : null}
    {!roles.length ? <EmptyState title="No roles yet" description="Add a role to start inviting and reviewing talent." actionLabel={canEdit ? "Add role" : undefined} onAction={() => setAdding(true)} /> : <div className="casting-role-grid">
      {roles.map((role) => {
        const ids = [role.id, role.bridgedRoleId, ...(role.bridgedRoleIds ?? [])];
        const candidates = (castingWorkflow?.candidates ?? []).filter((person) => person.roleIds.some((id) => ids.includes(id)));
        return <Link className="casting-role-tile" key={role.id} href={roleWorkspaceHref(projectId, role.id, destination === "breakdown" ? "review" : destination === "review" && query.get("stage") === "shortlisted" ? "shortlist" : destination)}>
          <div className="casting-role-tile__art"><RosterStack size="lg" people={candidates.map((person) => ({ id: person.id, name: person.displayName, avatarUrl: person.headshotUrl ?? null }))} /></div>
          <div className="casting-role-tile__copy"><strong>{role.name}</strong><span>{candidates.length} {candidates.length === 1 ? "submission" : "submissions"} · {role.isCastingFinalized ? "Finalized" : `${role.quantityNeeded} needed`}</span></div>
        </Link>;
      })}
    </div>}
    {adding ? <CastingRoleEditor onClose={() => setAdding(false)} /> : null}
  </div>;
}
