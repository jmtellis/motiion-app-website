import type {
  PublicCastingCompensationLine,
  PublicCastingRole,
  PublicCastingScheduleGroup,
} from "@/types/public";

export function OrganizerRow({ name, headshotURL }: { name: string; headshotURL: string | null }) {
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

export function CompensationSection({ lines }: { lines: PublicCastingCompensationLine[] }) {
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

export function ScheduleSection({ schedule }: { schedule: PublicCastingScheduleGroup[] }) {
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

export function RoleDetailPanel({ role }: { role: PublicCastingRole }) {
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
