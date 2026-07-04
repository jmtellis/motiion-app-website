"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { CastingPublicShell } from "@/components/casting/CastingPublicShell";
import { OpenInAppBar } from "@/components/product/OpenInAppBar";
import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import { formatCastingDeadline } from "@/lib/publicCasting";
import type {
  PublicCasting,
  PublicCastingCompensationLine,
  PublicCastingRole,
  PublicCastingScheduleGroup,
} from "@/types/public";

const SITE_HOME = "https://www.motiion.app";

export default function CastingPageClient({ casting }: { casting: PublicCasting }) {
  const searchParams = useSearchParams();
  const roleFromQuery = searchParams.get("role");

  const initialRoleId = useMemo(() => {
    if (roleFromQuery && casting.roles.some((role) => role.id === roleFromQuery)) {
      return roleFromQuery;
    }
    if (casting.selectedRoleId && casting.roles.some((role) => role.id === casting.selectedRoleId)) {
      return casting.selectedRoleId;
    }
    return null;
  }, [casting.roles, casting.selectedRoleId, roleFromQuery]);

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(initialRoleId);
  const [showSignUpGate, setShowSignUpGate] = useState(false);

  const selectedRole = casting.roles.find((role) => role.id === selectedRoleId) ?? null;
  const deadlineLine = formatCastingDeadline(casting.deadline);
  const showActionBar = Boolean(selectedRole && !casting.externalSubmissionURL);
  const canSubmit = Boolean(selectedRole?.eligibleForSubmission);
  const productionLine = casting.production?.trim();
  const compensationBreakdown = casting.compensationBreakdown ?? [];
  const schedule = casting.schedule ?? [];
  const additionalNotes = casting.additionalNotes?.trim() || casting.usageNotes?.trim() || null;
  const compensationLines =
    compensationBreakdown.length > 0
      ? compensationBreakdown
      : casting.compensationSummary?.trim()
        ? [{ label: "Details", value: casting.compensationSummary.trim() }]
        : [];

  const openInAppPath = useMemo(() => {
    const projectPath = `/casting/${encodeURIComponent(casting.id)}`;
    if (selectedRoleId) {
      return `${projectPath}?role=${encodeURIComponent(selectedRoleId)}`;
    }
    return projectPath;
  }, [casting.id, selectedRoleId]);

  return (
    <CastingPublicShell>
      <PublicPageAnalytics
        eventName="casting_viewed"
        properties={{ casting_id: casting.id, activity_type: "casting" }}
        path={`/casting/${casting.id}`}
      />
      <PublicPageAnalytics
        eventName="opportunity_viewed"
        properties={{ opportunity_id: casting.id, activity_type: "casting" }}
        path={`/casting/${casting.id}`}
      />
      <article className="casting-page" style={{ paddingBottom: showActionBar ? 88 : 24 }}>
        <header className="casting-page-header">
          <h1 className="casting-page-title">{casting.title}</h1>
          {productionLine ? (
            <p className="casting-page-subtitle">Casting for {productionLine}</p>
          ) : null}
        </header>

        <div className="casting-page-hero">
          {casting.coverImageURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={casting.coverImageURL} alt="" />
          ) : null}
          <div className="casting-page-hero-overlay" />
          <div className="casting-page-hero-meta">
            {deadlineLine ? <p className="casting-page-deadline">Deadline · {deadlineLine}</p> : null}
            {casting.location ? <p className="casting-page-location">{casting.location}</p> : null}
          </div>
        </div>

        {casting.organizerName?.trim() ? (
          <OrganizerRow
            name={casting.organizerName.trim()}
            headshotURL={casting.organizerHeadshotURL ?? null}
          />
        ) : null}

        {casting.roles.length > 0 ? (
          <div className="casting-role-tabs" role="tablist" aria-label="Casting roles">
            {casting.roles.map((role) => (
              <button
                key={role.id}
                type="button"
                role="tab"
                className="casting-role-tab"
                data-active={selectedRoleId === role.id}
                aria-selected={selectedRoleId === role.id}
                onClick={() => setSelectedRoleId(role.id)}
              >
                {role.title}
              </button>
            ))}
          </div>
        ) : null}

        {selectedRole ? (
          <RoleDetailPanel role={selectedRole} />
        ) : (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Select a role</h2>
            <p className="casting-body-copy">Choose a role above to view requirements and submit.</p>
            {casting.description?.trim() ? (
              <>
                <div className="casting-divider" />
                <h2 className="casting-section-title">About this casting</h2>
                <p className="casting-body-copy">{casting.description.trim()}</p>
              </>
            ) : null}
          </section>
        )}

        {compensationLines.length > 0 && selectedRole ? (
          <CompensationSection lines={compensationLines} />
        ) : null}

        {schedule.length > 0 && selectedRole ? (
          <ScheduleSection schedule={schedule} />
        ) : null}

        {additionalNotes && selectedRole ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Additional notes</h2>
            <p className="casting-body-copy">{additionalNotes}</p>
          </section>
        ) : null}

        {casting.externalSubmissionURL ? (
          <a
            href={casting.externalSubmissionURL}
            target="_blank"
            rel="noopener noreferrer"
            className="casting-btn-primary casting-external-link"
          >
            Apply on external site
          </a>
        ) : null}
      </article>

      <OpenInAppBar href={openInAppPath} label="Open in the Motiion app" />

      {showActionBar ? (
        <div className="casting-submit-bar">
          <button
            type="button"
            className="casting-submit-button"
            disabled={!canSubmit}
            onClick={() => {
              if (canSubmit) setShowSignUpGate(true);
            }}
          >
            {canSubmit ? "Submit" : "Casting closed"}
          </button>
        </div>
      ) : null}

      {showSignUpGate ? (
        <CastingSignUpRequiredModal onClose={() => setShowSignUpGate(false)} />
      ) : null}
    </CastingPublicShell>
  );
}

function OrganizerRow({ name, headshotURL }: { name: string; headshotURL: string | null }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <p className="casting-page-organizer">
      {headshotURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={headshotURL} alt="" className="casting-page-organizer-avatar" />
      ) : (
        <span className="casting-page-organizer-avatar casting-page-organizer-avatar-fallback" aria-hidden>
          {initials || "?"}
        </span>
      )}
      <span>Posted by {name}</span>
    </p>
  );
}

function CompensationSection({ lines }: { lines: PublicCastingCompensationLine[] }) {
  return (
    <section className="casting-glass-card">
      <h2 className="casting-section-title">Compensation</h2>
      <dl className="casting-breakdown">
        {lines.map((line) => (
          <div key={`${line.label}-${line.value}`} className="casting-breakdown-row">
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ScheduleSection({ schedule }: { schedule: PublicCastingScheduleGroup[] }) {
  return (
    <section className="casting-glass-card">
      <h2 className="casting-section-title">Schedule</h2>
      <div className="casting-schedule-groups">
        {schedule.map((group) => (
          <div key={group.category}>
            <h3 className="casting-schedule-group-title">{group.category}</h3>
            <div className="casting-schedule-days">
              {group.days.map((day) => (
                <span key={`${group.category}-${day}`} className="casting-schedule-day">
                  {day}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RoleDetailPanel({ role }: { role: PublicCastingRole }) {
  return (
    <section className="casting-glass-card">
      {role.description?.trim() ? (
        <>
          <h2 className="casting-section-title">Description</h2>
          <p className="casting-body-copy">{role.description.trim()}</p>
          <div className="casting-divider" />
        </>
      ) : null}

      <h2 className="casting-section-title">Requirements</h2>
      <dl className="casting-requirements">
        <RequirementRow label="Age Range" value={role.ageRangeText} />
        {role.gender?.trim() ? <RequirementRow label="Gender" value={role.gender.trim()} /> : null}
        {role.ethnicityPreferences.length > 0 ? (
          <RequirementRow label="Ethnicity" value={role.ethnicityPreferences.join(", ")} />
        ) : null}
        {role.heightRangeText ? <RequirementRow label="Height" value={role.heightRangeText} /> : null}
        {role.unionStatus?.trim() ? <RequirementRow label="Union" value={role.unionStatus.trim()} /> : null}
        {role.peopleNeeded > 1 ? (
          <RequirementRow label="People Needed" value={String(role.peopleNeeded)} />
        ) : null}
      </dl>

      {role.specialSkills.length > 0 ? (
        <>
          <div className="casting-divider" />
          <h2 className="casting-section-title">Special Skills</h2>
          <div className="casting-skill-tags">
            {role.specialSkills.map((skill) => (
              <span key={skill} className="casting-skill-tag">
                {skill}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function RequirementRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="casting-requirement-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CastingSignUpRequiredModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="casting-signup-title"
      className="casting-modal-backdrop"
      onClick={onClose}
    >
      <div className="casting-modal-card" onClick={(event) => event.stopPropagation()}>
        <h2 id="casting-signup-title" className="casting-modal-title">
          Account required
        </h2>
        <p className="casting-body-copy">
          To submit to this casting, download the Motiion app, create an account, then open this link again.
        </p>
        <div className="casting-modal-actions">
          <a href={`${SITE_HOME}#signup`} className="casting-modal-primary">
            Get the app
          </a>
          <button type="button" onClick={onClose} className="casting-modal-dismiss">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
