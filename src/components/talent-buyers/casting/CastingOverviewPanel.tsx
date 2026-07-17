"use client";

import Link from "next/link";

import {
  enrichRolesWithCounts,
  getCastingAttentionItems,
} from "@/lib/talent-buyers/casting/casting-metrics";
import { castingWorkspaceHref } from "@/lib/talent-buyers/casting/casting-routes";

import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { useProjectWorkspace } from "@/components/talent-buyers/project/ProjectWorkspaceContext";

import { CastingOverviewRoleCard } from "./CastingOverviewRoleCard";
import { ProjectOverviewTalentSection } from "@/components/talent-buyers/project/ProjectOverviewTalentSection";

import "./casting-workspace.css";
import "./casting-overview.css";

export function CastingOverviewPanel() {
  const { projectId, castingWorkflow, rosterMembers } = useProjectWorkspace();

  const workflow = castingWorkflow ?? {
    primaryCasting: null,
    roles: [],
    candidates: [],
    invitations: [],
    referrals: [],
    externalCandidates: [],
    evaluations: [],
  };

  const attention = getCastingAttentionItems({
    projectId,
    casting: workflow.primaryCasting,
    roles: workflow.roles,
    candidates: workflow.candidates,
  });
  const roles = enrichRolesWithCounts(workflow.roles, workflow.candidates);
  const submissionDeadline = workflow.primaryCasting?.submissionDeadline ?? null;

  if (!workflow.primaryCasting && roles.length === 0) {
    return (
      <div className="casting-overview">
        <EmptyState
          variant="dashboard"
          title="No breakdown yet"
          description="Define the casting details and roles to see progress at a glance."
          actionLabel="Create breakdown"
          actionHref={castingWorkspaceHref(projectId, "breakdown")}
        />
      </div>
    );
  }

  return (
    <div className="casting-overview">
      {attention.length > 0 ? (
        <section className="casting-overview-attention" aria-label="Attention required">
          <ul className="casting-attention-list">
            {attention.slice(0, 3).map((item) => (
              <li
                key={item.id}
                className={`casting-attention-item${item.priority === "high" ? " casting-attention-item--high" : ""}`}
              >
                <span>{item.message}</span>
                {item.actionLabel ? (
                  <Link href={item.href} className="casting-role-card__link">
                    {item.actionLabel}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {roles.length > 0 ? (
        <h3 className="casting-overview-toolbar__title">Roles</h3>
      ) : null}

      <section className="casting-overview-roles" aria-label="Roles">
        {roles.length === 0 ? (
          <EmptyState
            variant="dashboard"
            title="No roles yet"
            description="Add roles to track casting progress per part."
            actionLabel="Add role"
            actionHref={
              workflow.primaryCasting
                ? `/projects/${projectId}/castings/${workflow.primaryCasting.id}/edit`
                : castingWorkspaceHref(projectId, "breakdown")
            }
          />
        ) : (
          <ul className="casting-overview-roles__grid">
            {roles.map((role) => (
              <li key={role.id}>
                <CastingOverviewRoleCard
                  projectId={projectId}
                  role={role}
                  candidates={workflow.candidates}
                  submissionDeadline={submissionDeadline}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="casting-overview-divider" role="separator" aria-hidden />

      <ProjectOverviewTalentSection
        projectId={projectId}
        rosterMembers={rosterMembers}
        variant="casting-candidates"
      />
    </div>
  );
}
