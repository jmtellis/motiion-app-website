"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Share2 } from "lucide-react";

import { countSubmittedCandidatesForCastingRole, CASTING_ROLE_OVERVIEW_AVATAR_GRID } from "@/lib/talent-buyers/casting/casting-role-preview";
import { castingWorkspaceHref } from "@/lib/talent-buyers/casting/casting-routes";
import type { CastingCandidate, CastingRole } from "@/lib/talent-buyers/casting/casting-types";
import { formatCastingDeadline } from "@/lib/publicCasting";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";

import { CastingRoleSubmissionAvatarGrid } from "./CastingRoleSubmissionAvatarGrid";

function totalSubmissionsLabel(count: number): string {
  return `${count} submission${count === 1 ? "" : "s"}`;
}

function RoleCardShareMenu({ rolePublicId }: { rolePublicId: string | null | undefined }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function shareRole() {
    if (!rolePublicId) {
      showToast({ message: "Publish the role to get a share link.", variant: "error" });
      return;
    }
    const fullUrl = `${window.location.origin}/casting/${rolePublicId}`;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(fullUrl);
      showToast({ message: "Role link copied", variant: "success" });
      setOpen(false);
    } catch {
      showToast({ message: "Could not copy link", variant: "error" });
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="casting-overview-role-card__menu" ref={menuRef}>
      <button
        type="button"
        className="casting-overview-role-card__menu-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Role actions"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>

      {open ? (
        <ul className="casting-overview-role-card__menu-list" role="menu">
          <li role="none">
            <button
              type="button"
              className="casting-overview-role-card__menu-item"
              role="menuitem"
              disabled={copying}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void shareRole();
              }}
            >
              <Share2 className="size-4 shrink-0" aria-hidden />
              Share role
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

export function CastingOverviewRoleCard({
  projectId,
  role,
  candidates,
  submissionDeadline,
}: {
  projectId: string;
  role: CastingRole;
  candidates: CastingCandidate[];
  submissionDeadline?: string | null;
}) {
  const roleFilterId = role.bridgedRoleId ?? role.id;
  const rolePublicId = role.bridgedRoleId ?? null;
  const deadlineLabel = formatCastingDeadline(submissionDeadline ?? null);
  const reviewHref = castingWorkspaceHref(projectId, "review", { roleId: roleFilterId });
  const totalSubmissionCount = countSubmittedCandidatesForCastingRole(candidates, role);

  return (
    <article className="casting-overview-role-card">
      <Link href={reviewHref} className="casting-overview-role-card__media" aria-label={`Open ${role.name}`}>
        <CastingRoleSubmissionAvatarGrid
          candidates={candidates}
          role={role}
          grid={CASTING_ROLE_OVERVIEW_AVATAR_GRID}
          bleed
        />
        <div className="casting-overview-role-card__media-scrim" aria-hidden />
        <span className="sr-only">{role.name}</span>
      </Link>

      <div className="casting-overview-role-card__body">
        <div className="casting-overview-role-card__row">
          <Link href={reviewHref} className="casting-overview-role-card__summary">
            <h3 className="casting-overview-role-card__title">{role.name}</h3>
            <p className="casting-overview-role-card__subtext casting-overview-role-card__subtext--default">
              {deadlineLabel ? (
                <>Deadline · {deadlineLabel}</>
              ) : (
                <span className="casting-overview-role-card__subtext--muted">No deadline set</span>
              )}
            </p>
            <p className="casting-overview-role-card__subtext casting-overview-role-card__subtext--hover">
              {totalSubmissionsLabel(totalSubmissionCount)}
            </p>
          </Link>

          <RoleCardShareMenu rolePublicId={rolePublicId} />
        </div>
      </div>
    </article>
  );
}
