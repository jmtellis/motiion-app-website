"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarCheck, ChevronRight, Megaphone, Users } from "lucide-react";
import { enableProjectAbilities } from "@/app/(buyer-app)/(paid)/projects/composable-actions";
import { type ProjectAbilityId } from "@/lib/talent-buyers/project-abilities";
import { projectAbilityFirstStepPath, projectAbilityPath, projectPath } from "@/lib/talent-buyers/project-routes";
import { castingOverviewState } from "@/lib/talent-buyers/casting/casting-completion";
import { useProjectWorkspace } from "../ProjectWorkspaceContext";
import { useComposableAbilityCounts } from "./ComposableProjectShell";
import { ProjectNotesPanel } from "./ProjectNotesPanel";
import { RosterStack } from "./RosterStackTile";
import "./composable-project.css";

export function ComposableProjectHome() {
  const router = useRouter();
  const { projectId, project, castings, castingWorkflow, rosterMembers } = useProjectWorkspace();
  const counts = useComposableAbilityCounts();
  const [pending, startTransition] = useTransition();
  const [starting, setStarting] = useState<ProjectAbilityId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const composable = project.composable;
  const abilities = composable?.abilities ?? [];
  const canEdit = project.isOwner !== false;
  const state = (id: ProjectAbilityId) => abilities.find((ability) => ability.id === id)?.status;
  const casting = castingWorkflow?.primaryCasting;
  const castingState = castingOverviewState({ roles: castingWorkflow?.roles ?? [], status: casting?.status ?? castings[0]?.status, visibility: casting?.visibility });
  const hasCasting = Boolean(state("casting") || (!composable && project.projectType === "casting"));
  const awaitingReview = castingWorkflow?.candidates.filter((candidate) => candidate.status === "submitted" || candidate.status === "in_review").length ?? 0;

  function start(ability: ProjectAbilityId) {
    if (!canEdit || !composable || pending) return;
    const resuming = state(ability) === "paused";
    setStarting(ability);
    setError(null);
    startTransition(async () => {
      try {
        const result = await enableProjectAbilities({ projectId, abilities: [ability] });
        if (!result.ok) { setError(result.error); return; }
        router.push(resuming ? projectAbilityPath(projectId, ability) : result.nextHref ?? projectAbilityFirstStepPath(projectId, ability));
        router.refresh();
      } catch { setError("Could not open this workspace. Please try again."); }
      finally { setStarting(null); }
    });
  }

  const cards = [
    { id: "casting", title: "Casting", icon: Megaphone, ability: "casting" as ProjectAbilityId,
      available: hasCasting, paused: state("casting") === "paused",
      status: hasCasting ? state("casting") === "paused" ? "Paused" : castingState.label : "Ready to start",
      description: "Define roles, invite talent, and find the right cast.",
      detail: hasCasting ? `${counts.castingRoleCount} ${counts.castingRoleCount === 1 ? "role" : "roles"} · ${awaitingReview} awaiting review` : "Start with your casting details and first role.",
      action: hasCasting ? "Open casting" : "Start casting", href: projectAbilityPath(projectId, "casting") },
    { id: "people", title: "People", icon: Users, ability: "roster" as ProjectAbilityId,
      available: !composable || Boolean(state("roster")), paused: state("roster") === "paused",
      status: state("roster") === "paused" ? "Paused" : rosterMembers.length ? `${rosterMembers.length} people` : "Build your team",
      description: "Keep talent, collaborators, and project groups together.",
      detail: rosterMembers.length ? "Open your people to organize groups or add someone new." : "Find people on Motiion or add a saved collection.",
      action: rosterMembers.length ? "Manage people" : "Add people", href: `${projectPath(projectId, "roster")}${rosterMembers.length ? "" : "?invite=1"}` },
    { id: "confirmations", title: "Confirmations", icon: CalendarCheck, ability: null,
      available: true, paused: false, status: "Plan your team",
      description: "Track availability, holds, and confirmed participation.",
      detail: "Bring casting selections here when you are ready for the next step.",
      action: "Manage confirmations", href: projectPath(projectId, "coordination") },
  ];

  return <div className="project-manage project-manage--cards">
    {error ? <p className="ui-notice" data-tone="error" role="alert">{error}</p> : null}
    <div className="project-manage__cards">
      {cards.map(({ id, title, description, detail, status, href, action, available, paused, ability, icon: Icon }) => <section className="project-tool-card" key={id} aria-labelledby={`project-tool-${id}`}>
        <div className={`project-tool-card__visual project-tool-card__visual--${id}`}>
          {id === "people" && rosterMembers.length ? <RosterStack people={rosterMembers.map((person) => ({ id: person.id, name: person.name, avatarUrl: person.avatarUrl }))} size="lg" /> : <Icon size={44} strokeWidth={1.4} aria-hidden />}
          <span className="project-tool-card__status">{status}</span>
        </div>
        <div className="project-tool-card__body"><h3 id={`project-tool-${id}`}>{title}</h3><p>{description}</p><span className="project-tool-card__detail">{detail}</span>
          {(!available || paused) && ability ? canEdit ? <button type="button" className="project-tool-card__action" disabled={pending} onClick={() => start(ability)}>{pending && starting === ability ? "Opening…" : paused ? `Resume ${title.toLowerCase()}` : action}<ChevronRight size={18} aria-hidden /></button> : <p className="project-tool-card__permission">The project owner can {paused ? "resume" : "start"} this workspace.</p>
            : <Link className="project-tool-card__action" href={href}>{!canEdit && id === "people" && !rosterMembers.length ? "View people" : action}<ChevronRight size={18} aria-hidden /></Link>}
        </div>
      </section>)}
    </div>
    <details className="project-manage__details"><summary>Notes</summary>
      <div className="project-manage__details-body">
        <ProjectNotesPanel key={projectId} projectId={projectId} body={project.notes ?? ""} canEdit={canEdit} />
      </div>
    </details>
  </div>;
}
