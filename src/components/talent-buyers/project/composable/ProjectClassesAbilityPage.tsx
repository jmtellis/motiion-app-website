import Link from "next/link";
import { CalendarPlus, GraduationCap } from "lucide-react";

import type { ProjectClassSeriesSummary, ProjectClassSession } from "@/lib/talent-buyers/project-classes";
import { formatProjectDateRange } from "@/lib/talent-buyers/project-abilities";
import { classSessionCreatePath } from "@/lib/talent-buyers/project-routes";

import "./composable-project.css";

function formatWhen(session: ProjectClassSession) {
  const day = session.activityDate ? formatProjectDateRange(session.activityDate, null) : null;
  const time = session.startTime
    ? new Date(`2000-01-01T${session.startTime.slice(0, 5)}:00`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  return [day ?? "Date TBD", time].filter(Boolean).join(" · ");
}

function formatPrice(session: ProjectClassSession) {
  if (session.tierCount > 1) return `${session.tierCount} ticket tiers`;
  if (!session.requiresPayment || !session.priceCents) return "Free";
  return `$${(session.priceCents / 100).toFixed(session.priceCents % 100 ? 2 : 0)}`;
}

function SessionRow({ session }: { session: ProjectClassSession }) {
  const capacity = session.capacity ? `${session.enrolledCount}/${session.capacity}` : `${session.enrolledCount}`;
  const full = session.capacity != null && session.enrolledCount >= session.capacity;
  return (
    <li className={`class-session class-session--${session.status}`}>
      <div className="class-session__when">
        <strong>{formatWhen(session)}</strong>
        <span>{session.location || "Location TBD"}</span>
      </div>
      <div className="class-session__title">
        <strong>{session.title}</strong>
        <span>
          {session.status === "draft" ? "Draft" : session.isListed ? "Listed" : "Invite-only"} · {formatPrice(session)}
        </span>
      </div>
      <dl className="class-session__stats">
        <div>
          <dt>Enrolled</dt>
          <dd>
            {capacity}
            {full ? " · Full" : ""}
          </dd>
        </div>
        <div>
          <dt>Waitlist</dt>
          <dd>{session.waitlistCount}</dd>
        </div>
        <div>
          <dt>Checked in</dt>
          <dd>{session.status === "upcoming" && session.checkedInCount === 0 ? "—" : session.checkedInCount}</dd>
        </div>
      </dl>
      <Link href={`/calendar/${session.id}`} className="bd-btn-secondary class-session__manage">
        {session.status === "past" ? "Attendance" : "Manage"}
      </Link>
    </li>
  );
}

export function ProjectClassesAbilityPage({
  projectId,
  sessions,
  summary,
  paused,
}: {
  projectId: string;
  sessions: ProjectClassSession[];
  summary: ProjectClassSeriesSummary;
  paused: boolean;
}) {
  const upcoming = sessions.filter((session) => session.status !== "past");
  const past = sessions.filter((session) => session.status === "past").reverse();

  return (
    <div className="ability-page">
      <header className="ability-page__header">
        <span className="ability-page__glyph" aria-hidden>
          <GraduationCap />
        </span>
        <div className="ability-page__title">
          <h2>Classes</h2>
          <p>A series of dated sessions with capacity, waitlist, and attendance.</p>
        </div>
        <div className="ability-page__actions">
          <Link href={classSessionCreatePath(projectId)} className="buyer-chrome-bar__cta">
            <CalendarPlus aria-hidden /> Add session
          </Link>
        </div>
      </header>

      {paused ? (
        <p className="ability-page__notice">Classes are paused. Sessions stay here; resume from + Ability.</p>
      ) : null}

      <dl className="ability-stats ability-stats--wide">
        <div className="ability-stat">
          <dt>Sessions</dt>
          <dd>{summary.sessionCount}</dd>
        </div>
        <div className="ability-stat">
          <dt>Upcoming</dt>
          <dd>{summary.upcomingCount}</dd>
        </div>
        <div className="ability-stat">
          <dt>Enrolled</dt>
          <dd>
            {summary.capacityTotal ? `${summary.enrolledTotal}/${summary.capacityTotal}` : summary.enrolledTotal}
          </dd>
        </div>
        <div className="ability-stat">
          <dt>Attendance</dt>
          <dd>{summary.attendanceRate != null ? `${Math.round(summary.attendanceRate * 100)}%` : "—"}</dd>
        </div>
      </dl>

      {sessions.length === 0 ? (
        <div className="ability-page__empty">
          <p>No sessions yet. Add the first date to start the series.</p>
          <Link href={classSessionCreatePath(projectId)} className="bd-btn-secondary">
            Add first session
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length ? (
            <section aria-labelledby="classes-upcoming">
              <h3 id="classes-upcoming" className="ability-page__section-title">
                Upcoming
              </h3>
              <ul className="class-session-list">
                {upcoming.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </ul>
            </section>
          ) : null}
          {past.length ? (
            <section aria-labelledby="classes-past">
              <h3 id="classes-past" className="ability-page__section-title">
                Past
              </h3>
              <ul className="class-session-list">
                {past.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
