"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Pencil, UserPlus } from "lucide-react";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { useProjectWorkspace } from "../project/ProjectWorkspaceContext";
import { projectHomePath, projectWorkspacePath } from "@/lib/talent-buyers/project-routes";
import { findWorkspaceRole, roleWorkspaceHref } from "@/lib/talent-buyers/casting/role-workspace";
import { CastingRoleEditor } from "./CastingRoleEditor";
const tabs = [{ id: "review", label: "Review submissions" }, { id: "shortlist", label: "Shortlist" }, { id: "cast", label: "Final selects" }] as const;
export function CastingRoleNavigation() {
  const { projectId, project, castingWorkflow } = useProjectWorkspace();
  const query = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const role = findWorkspaceRole(castingWorkflow?.roles ?? [], query.get("role"));
  const active = pathname.endsWith("/cast") ? "cast" : pathname.endsWith("/client-review") || query.get("stage") === "shortlisted" ? "shortlist" : "review";
  const canEdit = project.isOwner !== false;
  const canInvite = project.canReviewCasting !== false;
  return <div className="project-drill-in casting-role-navigation">
    <div className="project-drill-in__trail">
      <Link href={projectHomePath(projectId)}>Manage</Link><span aria-hidden>/</span>
      {role ? <><Link href={projectWorkspacePath(projectId, "breakdown")}>Casting</Link><span aria-hidden>/</span><h2>{role.name}</h2>
        {canEdit ? <button className="casting-role-edit" aria-label={`Edit ${role.name}`} title="Edit role" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden /></button> : null}</> : <h2>Casting</h2>}
    </div>
    {role ? <>
      <nav className="project-casting-steps" aria-label="Role workflow">
        {tabs.map((tab) => <div className="casting-role-tab" key={tab.id}><Link href={roleWorkspaceHref(projectId, role.id, tab.id)} aria-current={active === tab.id ? "page" : undefined}>{tab.label}</Link>
          {tab.id === "review" && canInvite ? <Link className="casting-role-invite" href={roleWorkspaceHref(projectId, role.id, "talent-search")} aria-label={`Invite talent to ${role.name}`} title="Invite talent"><UserPlus size={16} aria-hidden /></Link> : null}
        </div>)}
      </nav>
      <div className="project-casting-step-picker"><FilterSelect label="Role workflow" value={active} options={tabs.map((tab) => ({ value: tab.id, label: tab.label }))}
        onChange={(value) => { const tab = tabs.find((item) => item.id === value); if (tab) router.push(roleWorkspaceHref(projectId, role.id, tab.id)); }} />
        {canInvite && active === "review" ? <Link className="casting-role-edit" href={roleWorkspaceHref(projectId, role.id, "talent-search")} aria-label="Invite talent" title="Invite talent"><UserPlus size={16} aria-hidden /></Link> : null}
      </div>
    </> : null}
    {editing && role ? <CastingRoleEditor roleId={role.id} onClose={() => setEditing(false)} /> : null}
  </div>;
}
