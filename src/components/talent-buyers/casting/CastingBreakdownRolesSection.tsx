"use client";

import { Users } from "lucide-react";

import type { CastingCandidate, CastingProject, CastingRole } from "@/lib/talent-buyers/casting/casting-types";

import { CastingOverviewRoleCard } from "./CastingOverviewRoleCard";

import "./casting-overview.css";

export function CastingBreakdownRolesSection({
  projectId,
  casting,
  roles,
  candidates,
  onEditRoles,
  embedded = false,
}: {
  projectId: string;
  casting: CastingProject | null;
  roles: CastingRole[];
  candidates: CastingCandidate[];
  onEditRoles?: () => void;
  /** When true, omit the outer heading — parent already renders the doc section label. */
  embedded?: boolean;
}) {
  const body =
    roles.length > 0 ? (
      <div className="casting-overview-roles__grid">
        {roles.map((role) => (
          <CastingOverviewRoleCard
            key={role.id}
            projectId={projectId}
            role={role}
            candidates={candidates}
            submissionDeadline={casting?.submissionDeadline}
          />
        ))}
      </div>
    ) : (
      <div className="casting-breakdown-workspace__empty-card">
        <p>No roles yet</p>
        {onEditRoles ? (
          <button type="button" className="casting-overview-breakdown__link" onClick={onEditRoles}>
            Add role
          </button>
        ) : null}
      </div>
    );

  if (embedded) {
    return body;
  }

  return (
    <section className="casting-breakdown-doc__section casting-breakdown-doc__section--wide" aria-labelledby="doc-Roles">
      <div className="casting-breakdown-doc__section-heading">
        <h3 id="doc-Roles" className="casting-breakdown-doc__section-title">
          <Users className="casting-breakdown-doc__section-icon" aria-hidden />
          Roles
        </h3>
        {onEditRoles ? (
          <button type="button" className="casting-overview-breakdown__link" onClick={onEditRoles}>
            Edit roles
          </button>
        ) : null}
      </div>
      <div className="casting-breakdown-doc__section-body">{body}</div>
    </section>
  );
}
