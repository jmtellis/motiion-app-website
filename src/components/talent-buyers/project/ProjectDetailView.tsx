"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Link2, MessageSquare, Phone, UserPlus, X } from "lucide-react";

import { CreateActivityButton } from "@/components/talent-buyers/dashboard/CreateActivityButton";
import type { ProjectInvitationRow } from "@/lib/app/invitations";
import type { CastingProjectDetail } from "@/types/casting";
import type { BuyerProjectSummary } from "@/types/talent-buyer-dashboard";
import type { ProjectActivitySummary } from "@/lib/talent-buyers/project-activities";
import type { ProjectMemberRow } from "@/lib/talent-buyers/project-members";
import { addProjectMemberByEmail, removeProjectMember } from "@/lib/talent-buyers/project-members";
import type { ProjectRosterMember } from "@/lib/talent-buyers/project-roster";
import { addSubmissionToProjectRoster } from "@/lib/talent-buyers/project-roster";
import type { ProjectSubmissionRow } from "@/lib/talent-buyers/casting-projects";
import {
  approveSubmission,
  callbackSubmission,
  rejectSubmission,
} from "@/lib/talent-buyers/submissions";
import {
  listRoleShortlistShares,
  type ShortlistShareSummary,
} from "@/lib/talent-buyers/shortlist-shares";
import {
  SUBMISSION_STATUS_STYLES,
  submissionStatusLabel,
} from "@/lib/talent-buyers/submission-status";
import { formatBuyerRelativeDate, labelFromSnake } from "@/lib/talent-buyers/dashboard-data";

import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { PageHeader } from "@/components/talent-buyers/dashboard/PageHeader";
import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import { ProjectDetailHero } from "@/components/talent-buyers/dashboard/ProjectDetailHero";
import { SectionHeader } from "@/components/talent-buyers/dashboard/SectionHeader";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { ProjectModuleCard } from "@/components/talent-buyers/project/ProjectModuleCard";
import { CastingShortlistShareModal } from "@/components/talent-buyers/casting/CastingShortlistShareModal";
import type { ProjectModules } from "@/types/project";

const projectTabs = [
  { label: "Overview", anchor: "#overview" },
  { label: "Roles", anchor: "#roles" },
  { label: "Talent Board", anchor: "#talent-board" },
  { label: "Roster", anchor: "#roster" },
  { label: "Activities", anchor: "#activities" },
  { label: "Team", anchor: "#team" },
  { label: "Invitations", anchor: "#invitations" },
  { label: "Messages", anchor: "#messages" },
] as const;

type ProjectDetailViewProps = {
  projectId: string;
  project: BuyerProjectSummary;
  liveDetail: CastingProjectDetail;
  submissions: ProjectSubmissionRow[];
  invitations: ProjectInvitationRow[];
  activities: ProjectActivitySummary[];
  members: ProjectMemberRow[];
  rosterMembers: ProjectRosterMember[];
  initialShares: ShortlistShareSummary[];
  firstRoleId: string | null;
  enabledModules: ProjectModules;
  castingCount: number;
};

export function ProjectDetailView({
  projectId,
  project,
  liveDetail,
  submissions,
  invitations,
  activities,
  members,
  rosterMembers,
  initialShares,
  firstRoleId,
  enabledModules,
  castingCount,
}: ProjectDetailViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareRoleId, setShareRoleId] = useState(firstRoleId ?? "");
  const [shares, setShares] = useState(initialShares);
  const [memberEmail, setMemberEmail] = useState("");

  useRegisterBuyerChrome({
    breadcrumbs: [
      { label: "Projects", href: "/projects" },
      { label: project.title },
    ],
    revision: project.lastUpdated,
    end: (
      <div className="flex flex-wrap gap-2">
        <Link href={`/projects/${projectId}/edit`} className="bd-btn-secondary text-sm">
          Edit
        </Link>
      </div>
    ),
  });

  const configuration = liveDetail.project.casting_configuration;

  function runSubmissionAction(
    action: () => Promise<{ ok: boolean; error?: string }>,
    successMessage: string,
    addToRoster = false,
    submissionId?: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        showToast({ message: result.error ?? "Action failed", variant: "error" });
        return;
      }
      if (addToRoster && submissionId) {
        await addSubmissionToProjectRoster(projectId, submissionId);
      }
      showToast({ message: successMessage, variant: "success" });
      router.refresh();
    });
  }

  function handleShareCreated(share: ShortlistShareSummary) {
    setShares((current) => [share, ...current]);
    startTransition(async () => {
      const listed = await listRoleShortlistShares(share.roleId);
      if (listed.shares.length) setShares(listed.shares);
      router.refresh();
    });
  }

  function handleAddMember(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await addProjectMemberByEmail({ projectId, email: memberEmail });
      if (!result.ok) {
        showToast({ message: result.error ?? "Could not add collaborator", variant: "error" });
        return;
      }
      setMemberEmail("");
      showToast({ message: "Collaborator added", variant: "success" });
      router.refresh();
    });
  }

  return (
    <>
      <PageHeader
        eyebrow={labelFromSnake(project.projectType)}
        title={project.title}
        showTitle={false}
        description={`Last updated ${formatBuyerRelativeDate(project.lastUpdated)} · ${project.talentCount} submissions`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/talent`} className="btn-outline text-sm">
              Find talent
            </Link>
            <button
              type="button"
              className="btn-outline text-sm"
              onClick={() => {
                setShareOpen(true);
              }}
              disabled={!liveDetail.roles.length}
            >
              Share with client
            </button>
            <Link href={`/messages?project=${projectId}`} className="btn-outline text-sm">
              Message team
            </Link>
            <Link href={`/projects/${projectId}/edit`} className="btn-primary text-sm">
              Edit project
            </Link>
            {firstRoleId ? (
              <Link href={`/casting/${firstRoleId}`} className="btn-outline text-sm">
                Public page
              </Link>
            ) : null}
          </div>
        }
      />

      <ProjectDetailHero
        id={project.id}
        coverImageUrl={project.coverImageUrl}
        projectType={project.projectType}
        status={project.status}
        showTitle={false}
      />

      <nav aria-label="Project sections" className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-4">
        {projectTabs.map((tab) => (
          <a
            key={tab.label}
            href={tab.anchor}
            className="ui-chip px-4 py-2 text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            {tab.label}
          </a>
        ))}
      </nav>


      <section id="modules" className="space-y-4">
        <SectionHeader title="Project modules" description="Open a hub to manage castings or activities for this project." />
        <div className="grid gap-4 md:grid-cols-2">
          {enabledModules.casting ? (
            <ProjectModuleCard
              title="Castings"
              description="Create and manage castings, roles, and submissions."
              href={`/projects/${projectId}/castings`}
              count={castingCount}
            />
          ) : null}
          {enabledModules.activities ? (
            <ProjectModuleCard
              title="Activities"
              description="Schedule classes, sessions, and events for this project."
              href={`/projects/${projectId}/activities`}
              count={activities.length}
            />
          ) : null}
        </div>
      </section>

      <section id="overview" className="space-y-4">
        <SectionHeader title="Overview" />
        <div className="ui-card p-5">
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
            {liveDetail.project.description || "No project description yet."}
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div>
              <dt className="text-[var(--ink-soft)]">Status</dt>
              <dd className="font-semibold text-[var(--ink)]">{labelFromSnake(project.status)}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-soft)]">Visibility</dt>
              <dd className="font-semibold text-[var(--ink)]">
                {labelFromSnake(liveDetail.project.visibility ?? "public")}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--ink-soft)]">Roles</dt>
              <dd className="font-semibold text-[var(--ink)]">{liveDetail.roles.length}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-soft)]">Submissions</dt>
              <dd className="font-semibold text-[var(--ink)]">{project.talentCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-soft)]">Location</dt>
              <dd className="font-semibold text-[var(--ink)]">
                {liveDetail.project.location || configuration?.location_city || "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--ink-soft)]">Rate type</dt>
              <dd className="font-semibold text-[var(--ink)]">
                {labelFromSnake(liveDetail.project.rate_type ?? "tbd")}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--ink-soft)]">Submission method</dt>
              <dd className="font-semibold text-[var(--ink)]">
                {labelFromSnake(configuration?.submission_method_raw ?? "in_app")}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--ink-soft)]">Union</dt>
              <dd className="font-semibold text-[var(--ink)]">
                {liveDetail.project.is_union ? "Yes" : "No"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section id="roles" className="space-y-4">
        <SectionHeader title="Roles" count={liveDetail.roles.length} />
        <div className="grid gap-4 md:grid-cols-2">
          {liveDetail.roles.map((role) => (
            <div key={role.id} className="ui-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[var(--ink)]">{role.title}</h3>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {role.description || "No role description yet."}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link
                    href={`/casting/${role.id}`}
                    className="text-sm font-medium text-[var(--accent-dark)] hover:underline"
                  >
                    Public page
                  </Link>
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]"
                    onClick={() => {
                      setShareRoleId(role.id);
                      setShareOpen(true);
                    }}
                  >
                    Share shortlist
                  </button>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[var(--ink-soft)]">Submissions</dt>
                  <dd className="font-medium text-[var(--ink)]">
                    {liveDetail.submissionCounts[role.id] ?? 0}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--ink-soft)]">People needed</dt>
                  <dd className="font-medium text-[var(--ink)]">{role.people_needed ?? 1}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section id="talent-board" className="space-y-4">
        <SectionHeader title="Talent Board" count={submissions.length} />
        {submissions.length ? (
          <div className="ui-card divide-y divide-[var(--line)]">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {submission.headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={submission.headshotUrl}
                      alt=""
                      className="size-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--tone)] text-sm font-semibold text-[var(--ink-soft)]">
                      {submission.fullName[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {submission.linkUrl ? (
                        <a href={submission.linkUrl} target="_blank" rel="noreferrer" className="hover:underline">
                          {submission.fullName}
                        </a>
                      ) : (
                        submission.fullName
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--ink-soft)]">
                      {submission.roleTitle}
                      {submission.agency ? ` · ${submission.agency}` : ""}
                      {submission.submittedAt
                        ? ` · applied ${formatBuyerRelativeDate(submission.submittedAt)}`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
                      SUBMISSION_STATUS_STYLES[submission.status]
                    }`}
                  >
                    {submissionStatusLabel(submission.status)}
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    title="Shortlist"
                    className="rounded-full border border-[var(--line)] p-1.5 text-[var(--ink-soft)] hover:bg-emerald-50 hover:text-emerald-700"
                    onClick={() =>
                      runSubmissionAction(
                        () => approveSubmission(submission.id),
                        "Shortlisted",
                        true,
                        submission.id,
                      )
                    }
                  >
                    <Check className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    title="Callback"
                    className="rounded-full border border-[var(--line)] p-1.5 text-[var(--ink-soft)] hover:bg-sky-50 hover:text-sky-700"
                    onClick={() =>
                      runSubmissionAction(() => callbackSubmission(submission.id), "Callback requested")
                    }
                  >
                    <Phone className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    title="Decline"
                    className="rounded-full border border-[var(--line)] p-1.5 text-[var(--ink-soft)] hover:bg-rose-50 hover:text-rose-700"
                    onClick={() =>
                      runSubmissionAction(() => rejectSubmission(submission.id), "Declined")
                    }
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No submissions yet"
            description="Share the public casting page or invite talent from the navigator to start receiving applications."
            actionLabel="Find talent"
            actionHref="/talent"
          />
        )}
      </section>

      <section id="roster" className="space-y-4">
        <SectionHeader title="Project Roster" count={rosterMembers.length} />
        {rosterMembers.length ? (
          <div className="ui-card divide-y divide-[var(--line)]">
            {rosterMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-9 items-center justify-center rounded-full bg-[var(--tone)] text-sm font-semibold">
                      {member.name[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                  <div>
                    {member.slug ? (
                      <Link href={`/talent/${member.slug}`} className="text-sm font-semibold hover:underline">
                        {member.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold">{member.name}</p>
                    )}
                    {member.notes ? (
                      <p className="text-xs text-[var(--ink-soft)]">{member.notes}</p>
                    ) : null}
                  </div>
                </div>
                <span className="text-xs text-[var(--ink-soft)]">
                  Added {formatBuyerRelativeDate(member.addedAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No talent on this project roster"
            description="Shortlist applicants from the talent board to add them here automatically."
            actionLabel="Review submissions"
            actionHref="#talent-board"
          />
        )}
      </section>

      <section id="activities" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader title="Activities" count={activities.length} />
          <CreateActivityButton projectId={projectId} triggerLabel="Create activity" />
        </div>
        {activities.length ? (
          <div className="ui-card divide-y divide-[var(--line)]">
            {activities.map((activity) => (
              <div key={activity.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">{activity.title}</p>
                  <p className="text-xs text-[var(--ink-soft)]">
                    {labelFromSnake(activity.eventType)} · {formatBuyerRelativeDate(activity.dateTime)} ·{" "}
                    {activity.location}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--ink-soft)]">{activity.attendeeCount} attending</span>
                  <Link href={`/calendar/${activity.id}`} className="text-sm text-[#2dd4bf]">
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No project activities"
            description="Schedule a class, session, or event connected to this project."
          />
        )}
      </section>

      <section id="team" className="space-y-4">
        <SectionHeader title="Collaborators" count={members.length} />
        <form onSubmit={handleAddMember} className="flex flex-wrap gap-2">
          <input
            type="email"
            value={memberEmail}
            onChange={(event) => setMemberEmail(event.target.value)}
            placeholder="collaborator@email.com"
            required
            className="input min-w-[220px] flex-1 text-sm"
          />
          <button type="submit" disabled={isPending} className="btn-primary text-sm">
            <UserPlus className="mr-1.5 inline size-4" aria-hidden />
            Invite
          </button>
        </form>
        {members.length ? (
          <div className="ui-card divide-y divide-[var(--line)]">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-semibold">{member.displayName}</p>
                  <p className="text-xs text-[var(--ink-soft)]">
                    {member.email ?? member.userId} · {labelFromSnake(member.role)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  className="text-xs text-rose-600 hover:underline"
                  onClick={() =>
                    startTransition(async () => {
                      const result = await removeProjectMember(member.id, projectId);
                      if (!result.ok) {
                        showToast({ message: result.error ?? "Could not remove", variant: "error" });
                        return;
                      }
                      router.refresh();
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Just you for now"
            description="Invite collaborators by email to share access to this project."
          />
        )}
      </section>

      <section id="invitations" className="space-y-4">
        <SectionHeader title="Invitations" count={invitations.length} />
        {invitations.length ? (
          <div className="ui-card divide-y divide-[var(--line)]">
            {invitations.map((invite) => (
              <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ink)] capitalize">
                    {invite.talentSlug ? (
                      <Link href={`/talent/${invite.talentSlug}`} className="hover:underline">
                        {invite.talentName}
                      </Link>
                    ) : (
                      invite.talentName
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                    Invited {formatBuyerRelativeDate(invite.createdAt)}
                    {invite.respondedAt ? ` · responded ${formatBuyerRelativeDate(invite.respondedAt)}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--tone)] px-3 py-1 text-xs font-semibold uppercase">
                  {labelFromSnake(invite.status)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No invitations sent"
            description="Invite talent from the Talent navigator or their profile."
            actionLabel="Open Talent"
            actionHref="/talent"
          />
        )}
      </section>

      <section id="messages" className="space-y-4">
        <SectionHeader title="Messages" />
        <div className="ui-card p-6">
          <p className="text-sm text-[var(--ink-soft)]">
            Project-scoped conversations with collaborators and talent appear in your inbox with this project as
            context.
          </p>
          <Link
            href={`/messages?project=${projectId}&title=${encodeURIComponent(project.title)}`}
            className="btn-primary mt-4 inline-flex text-sm"
          >
            <MessageSquare className="mr-2 size-4" aria-hidden />
            Open project inbox
          </Link>
        </div>
      </section>

      {shares.length ? (
        <section className="space-y-3">
          <SectionHeader title="Active client links" count={shares.length} />
          <div className="ui-card divide-y divide-[var(--line)]">
            {shares.map((share) => (
              <div key={share.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-semibold">{share.title ?? "Client presentation"}</p>
                  <p className="text-xs text-[var(--ink-soft)]">
                    Created {formatBuyerRelativeDate(share.createdAt)}
                    {share.expiresAt ? ` · expires ${formatBuyerRelativeDate(share.expiresAt)}` : ""}
                  </p>
                </div>
                <a
                  href={share.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-dark)] hover:underline"
                >
                  <Link2 className="size-4" aria-hidden />
                  Copy link
                </a>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <CastingShortlistShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        roleIds={shareRoleId ? [shareRoleId] : liveDetail.roles.map((role) => role.id)}
        title={
          liveDetail.roles.find((role) => role.id === shareRoleId)?.title ??
          liveDetail.roles[0]?.title ??
          "Shortlist"
        }
        scopeLabel={
          liveDetail.roles.find((role) => role.id === shareRoleId)?.title ??
          liveDetail.roles[0]?.title ??
          "the selected role"
        }
        onShareCreated={handleShareCreated}
      />
    </>
  );
}
