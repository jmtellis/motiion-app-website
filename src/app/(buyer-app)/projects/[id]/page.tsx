import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/talent-buyers/dashboard/PageHeader";
import { SectionHeader } from "@/components/talent-buyers/dashboard/SectionHeader";
import {
  fetchPosterCastingDetail,
  fetchProjectSubmissions,
  mapCastingDetailToSummary,
} from "@/lib/talent-buyers/casting-projects";
import { listProjectInvitations } from "@/lib/app/invitations";
import { formatBuyerRelativeDate, getBuyerDashboardData, labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import { requireHiringAccount } from "@/lib/auth/session";

const INVITE_STATUS_STYLES: Record<string, string> = {
  sent: "bg-[var(--tone)] text-[var(--ink-soft)]",
  viewed: "bg-sky-100 text-sky-800",
  accepted: "bg-emerald-100 text-emerald-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  declined: "bg-rose-100 text-rose-800",
};

const SUBMISSION_STATUS_STYLES: Record<string, string> = {
  submitted: "bg-[var(--tone)] text-[var(--ink-soft)]",
  under_review: "bg-sky-100 text-sky-800",
  shortlisted: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  declined: "bg-rose-100 text-rose-800",
};

const projectTabs = [
  { label: "Overview", anchor: "#overview" },
  { label: "Roles", anchor: "#roles" },
  { label: "Talent Board", anchor: "#talent-board" },
  { label: "Invitations", anchor: "#invitations" },
] as const;

export default async function BuyerProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireHiringAccount();
  const { id } = await params;
  const liveDetail = await fetchPosterCastingDetail(id, profile.id);
  const mockProject = getBuyerDashboardData().projects.find((item) => item.id === id);

  if (liveDetail) {
    const [{ invitations }, submissions] = await Promise.all([
      listProjectInvitations(id),
      fetchProjectSubmissions(
        liveDetail.roles.map((role) => ({ id: role.id, title: role.title ?? "Role" })),
      ),
    ]);
    const project = mapCastingDetailToSummary(liveDetail);
    const configuration = liveDetail.project.casting_configuration;
    const firstRole = liveDetail.roles[0];

    return (
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <PageHeader
          eyebrow={labelFromSnake(project.projectType)}
          title={project.title}
          description={`Last updated ${formatBuyerRelativeDate(project.lastUpdated)} · ${project.talentCount} submissions`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${id}/edit`} className="btn-primary text-sm">
                Edit casting
              </Link>
              {firstRole ? (
                <Link href={`/casting/${firstRole.id}`} className="btn-outline text-sm">
                  View public page
                </Link>
              ) : null}
              <Link href="/projects" className="btn-outline text-sm">
                All projects
              </Link>
            </div>
          }
        />

        <nav
          aria-label="Project sections"
          className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-4"
        >
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
              <div
                key={role.id}
                className="ui-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--ink)]">{role.title}</h3>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">
                      {role.description || "No role description yet."}
                    </p>
                  </div>
                  <Link href={`/casting/${role.id}`} className="text-sm font-medium text-[var(--accent-dark)] hover:underline">
                    Public page
                  </Link>
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
                          <a
                            href={submission.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
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
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
                      SUBMISSION_STATUS_STYLES[submission.status] ?? SUBMISSION_STATUS_STYLES.submitted
                    }`}
                  >
                    {labelFromSnake(submission.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ui-muted-panel px-6 py-8 text-center text-sm text-[var(--ink-soft)]">
              No submissions yet. Share the public casting page or invite talent to start receiving
              applications.
            </div>
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
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
                      INVITE_STATUS_STYLES[invite.status] ?? INVITE_STATUS_STYLES.sent
                    }`}
                  >
                    {labelFromSnake(invite.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ui-muted-panel px-6 py-8 text-center text-sm text-[var(--ink-soft)]">
              No invitations sent yet. Invite talent from the Talent Navigator.
            </div>
          )}
        </section>
      </div>
    );
  }

  if (!mockProject) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <PageHeader
        eyebrow={labelFromSnake(mockProject.projectType)}
        title={mockProject.title}
        description={`Last updated ${formatBuyerRelativeDate(mockProject.lastUpdated)} · ${mockProject.talentCount} talent`}
        actions={
          <Link href="/projects" className="btn-outline text-sm">
            All projects
          </Link>
        }
      />

      <nav
        aria-label="Project sections"
        className="flex flex-wrap gap-2 border-b border-[var(--line)] pb-4"
      >
        {projectTabs.map((tab) => (
          <span
            key={tab.label}
            className="ui-chip px-4 py-2 text-sm font-medium text-[var(--ink-soft)]"
          >
            {tab.label}
          </span>
        ))}
      </nav>

      <section className="space-y-4">
        <SectionHeader title="Overview" />
        <div className="ui-card p-5">
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
            Central workspace for talent selection, notes, and client sharing. Each section below will connect to
            live project data soon.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-[var(--ink-soft)]">Status</dt>
              <dd className="font-semibold text-[var(--ink)]">{labelFromSnake(mockProject.status)}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-soft)]">Talent</dt>
              <dd className="font-semibold text-[var(--ink)]">{mockProject.talentCount}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-soft)]">Shared links</dt>
              <dd className="font-semibold text-[var(--ink)]">{mockProject.sharedLinksCount ?? 0}</dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {projectTabs.slice(1).map((tab) => (
          <section key={tab.label} className="space-y-3">
            <SectionHeader title={tab.label} />
            <div className="ui-muted-panel px-6 py-8 text-center text-sm text-[var(--ink-soft)]">
              {tab.label} — coming soon.
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
