import {
  COMPENSATION_CATEGORY_OPTIONS,
  CASTING_KIND_OPTIONS,
  RATE_TYPE_OPTIONS,
  SUBMISSION_METHOD_OPTIONS,
  SUBMITTER_POLICY_OPTIONS,
  VISIBILITY_OPTIONS,
  VISIBILITY_PRESENTATION_OPTIONS,
  ELIGIBILITY_OPTIONS,
} from "@/lib/talent-buyers/casting-composer-defaults";
import { castingVisibilityLabel } from "@/lib/talent-buyers/casting/casting-display";
import { resolveAuditionLocation } from "@/lib/talent-buyers/casting/casting-schedule";
import { labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import { formatCastingDeadline } from "@/lib/publicCasting";
import type { CastingComposerForm, CastingConfiguration } from "@/types/casting";
import type { CastingProject, CastingRole } from "./casting-types";
import { castingWorkspaceHref } from "./casting-routes";

export { castingConfigurationToComposerForm } from "./casting-breakdown-sections";

export type CastingBreakdownBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; title?: string; items: string[] }
  | { type: "note"; text: string };

export type CastingBreakdownDocumentSection = {
  title: string;
  blocks: CastingBreakdownBlock[];
};

export type CastingBreakdownDocumentRole = {
  id: string;
  title: string;
  description?: string;
  summary?: string;
  pipeline?: string;
  reviewHref?: string;
};

export type CastingBreakdownDocument = {
  title: string;
  byline: string[];
  intro?: string;
  sections: CastingBreakdownDocumentSection[];
  roles: CastingBreakdownDocumentRole[];
  readiness: { label: string; ok: boolean }[];
};

function labelFor<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? labelFromSnake(value);
}

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateRange(start?: string | null, end?: string | null): string | null {
  if (!start) return null;
  if (!end || end === start) return start;
  return `${start} – ${end}`;
}

function formatScheduleRanges(config: CastingConfiguration): string[] {
  const lines: string[] = [];
  const productionDates = (config.production_dates_yyyymmdd ?? []).map((value) => {
    if (value.includes("-")) return value;
    if (value.length !== 8) return value;
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  });
  const production = config.production_date_ranges ?? [];
  const rehearsal = config.rehearsal_date_ranges ?? [];
  const categories = (config.schedule_categories ?? []).filter(
    (category) => (category.selected_days_yyyymmdd ?? []).length > 0,
  );
  const sessions = config.audition_sessions ?? [];

  if (categories.length) {
    for (const category of categories) {
      const label =
        category.activity_type_raw === "Custom"
          ? category.custom_schedule_title?.trim() || "Other"
          : category.activity_type_raw;
      const days = (category.selected_days_yyyymmdd ?? [])
        .map((value) => formatDateTime(value) ?? value)
        .join(", ");
      lines.push(`${label}: ${days}`);
    }
  } else if (productionDates.length) {
    lines.push(
      `Production: ${productionDates
        .map((value) => formatDateTime(value) ?? value)
        .join(", ")}`,
    );
  } else if (production.length) {
    lines.push(
      `Production: ${production
        .map((range) => formatDateRange(range.start_yyyymmdd, range.end_yyyymmdd))
        .filter(Boolean)
        .join(", ")}`,
    );
  }
  if (!categories.length && rehearsal.length) {
    lines.push(
      `Rehearsal: ${rehearsal
        .map((range) => formatDateRange(range.start_yyyymmdd, range.end_yyyymmdd))
        .filter(Boolean)
        .join(", ")}`,
    );
  }
  if (sessions.length) {
    lines.push(
      ...sessions.map((session) => {
        const audition = formatDateTime(session.datetime_iso8601) ?? session.datetime_iso8601;
        const title = session.title?.trim() || "Audition";
        if (session.has_callback && session.callback_datetime_iso8601) {
          const callback =
            formatDateTime(session.callback_datetime_iso8601) ?? session.callback_datetime_iso8601;
          return `${title}: ${audition} (callback ${callback})`;
        }
        return `${title}: ${audition}`;
      }),
    );
  }
  return lines;
}

function joinLocationParts(parts: (string | null | undefined)[]): string | null {
  const filtered = parts.map((part) => part?.trim()).filter(Boolean) as string[];
  if (!filtered.length) return null;
  return filtered.join(", ");
}

function buildLocationSection(form: CastingComposerForm): CastingBreakdownDocumentSection | null {
  const config = form.configuration;
  const paragraphs: string[] = [];

  const groups = config.schedule_location_groups ?? [];
  const categories = config.schedule_categories ?? [];
  if (groups.length && categories.length) {
    for (const category of categories) {
      const group = groups.find((entry) => entry.category_id_key === category.id_key);
      if (!group || group.location_scope_raw === "none") continue;
      const label =
        category.activity_type_raw === "Custom"
          ? category.custom_schedule_title?.trim() || "Other"
          : category.activity_type_raw;
      if (group.location_scope_raw === "per_day" && (group.day_locations?.length ?? 0) > 0) {
        paragraphs.push(
          `${label} by day: ${group.day_locations
            .map((entry) => {
              const date = entry.date_yyyymmdd.includes("-")
                ? entry.date_yyyymmdd
                : `${entry.date_yyyymmdd.slice(0, 4)}-${entry.date_yyyymmdd.slice(4, 6)}-${entry.date_yyyymmdd.slice(6, 8)}`;
              return `${date}: ${entry.location_label || entry.location_venue || "TBD"}`;
            })
            .join("; ")}.`,
        );
        continue;
      }
      if (group.location_label?.trim()) {
        paragraphs.push(`${label} location: ${group.location_label}.`);
      }
    }
  } else {
    const dayLocations = config.production_day_locations ?? [];
    if (config.production_location_scope_raw === "per_day" && dayLocations.length > 0) {
      paragraphs.push(
        `Production locations by day: ${dayLocations
          .map((entry) => {
            const date = entry.date_yyyymmdd.includes("-")
              ? entry.date_yyyymmdd
              : `${entry.date_yyyymmdd.slice(0, 4)}-${entry.date_yyyymmdd.slice(4, 6)}-${entry.date_yyyymmdd.slice(6, 8)}`;
            return `${date}: ${entry.location_label || entry.location_venue || "TBD"}`;
          })
          .join("; ")}.`,
      );
    } else {
      const place = joinLocationParts([
        config.location_venue,
        config.location_city || form.location,
        config.location_region,
        config.location_country,
      ]);
      if (place || form.location.trim()) {
        paragraphs.push(`Production location: ${place || form.location}.`);
      }
    }
  }

  if (config.local_hire_only) {
    paragraphs.push("Local hire only.");
  }

  const auditionSessions = (config.audition_sessions ?? []).filter((session) =>
    Boolean(session.datetime_iso8601),
  );
  for (const session of auditionSessions) {
    const title = session.title?.trim() || "Audition";
    const resolved = resolveAuditionLocation(session, form);
    if (resolved.mode === "remote") {
      paragraphs.push(
        resolved.remoteUrl
          ? `${title}: remote audition (${resolved.remoteUrl}).`
          : `${title}: remote audition.`,
      );
      continue;
    }

    const auditionPlace = joinLocationParts([
      resolved.label,
      resolved.city && resolved.label?.includes(resolved.city) ? null : resolved.city,
      resolved.region && resolved.label?.includes(resolved.region) ? null : resolved.region,
    ]);
    if (auditionPlace || resolved.notes) {
      const detail = [auditionPlace, resolved.notes].filter(Boolean).join(" — ");
      paragraphs.push(`${title} location: ${detail}.`);
    }
  }

  const scheduleLines = formatScheduleRanges(config);
  const audition =
    (config.audition_sessions?.length ?? 0) > 0
      ? null
      : formatDateTime(config.audition_date_iso8601);
  const callback =
    (config.audition_sessions?.length ?? 0) > 0
      ? null
      : formatDateTime(config.callback_date_iso8601);

  if (scheduleLines.length || audition || callback) {
    const scheduleParts = [...scheduleLines];
    if (audition) scheduleParts.push(`Auditions: ${audition}`);
    if (callback) scheduleParts.push(`Callbacks: ${callback}`);
    paragraphs.push(scheduleParts.join(" "));
  }

  if (!paragraphs.length) return null;

  return {
    title: "Location & schedule",
    blocks: paragraphs.map((text) => ({ type: "paragraph", text })),
  };
}

function buildCompensationSection(form: CastingComposerForm): CastingBreakdownDocumentSection | null {
  const config = form.configuration;
  const paragraphs: string[] = [];

  const category = labelFor(COMPENSATION_CATEGORY_OPTIONS, config.compensation_category_raw);
  const rateType = labelFor(RATE_TYPE_OPTIONS, form.rateType);
  const coverage = config.compensation_coverage_raws?.length
    ? config.compensation_coverage_raws.join(", ")
    : null;

  const lead = [
    category,
    rateType ? `${rateType.toLowerCase()} compensation` : null,
    form.isUnion === true ? "union contract" : form.isUnion === false ? "non-union" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (lead) paragraphs.push(`${lead.charAt(0).toUpperCase()}${lead.slice(1)}.`);

  if (config.compensation_amount_notes?.trim()) {
    paragraphs.push(config.compensation_amount_notes.trim());
  }
  if (coverage) {
    paragraphs.push(`Coverage includes ${coverage.toLowerCase()}.`);
  }

  if (!paragraphs.length) return null;

  return {
    title: "Compensation",
    blocks: paragraphs.map((text) => ({ type: "paragraph", text })),
  };
}

function buildSubmissionSection(form: CastingComposerForm): CastingBreakdownDocumentSection | null {
  const config = form.configuration;
  const blocks: CastingBreakdownBlock[] = [];

  const method = labelFor(SUBMISSION_METHOD_OPTIONS, config.submission_method_raw);
  const presentation = labelFor(VISIBILITY_PRESENTATION_OPTIONS, config.visibility_presentation_raw);
  const policy = labelFor(SUBMITTER_POLICY_OPTIONS, config.submitter_policy_raw);
  const deadline =
    formatCastingDeadline(config.submission_deadline_iso8601 ?? null) ??
    formatDateTime(config.submission_deadline_iso8601);

  const introParts = [
    method ? `Submissions are accepted via ${method.toLowerCase()}` : null,
    presentation ? `as a ${presentation.toLowerCase()}` : null,
    policy ? `(${policy.toLowerCase()})` : null,
    deadline ? `through ${deadline}` : null,
  ].filter(Boolean);

  if (introParts.length) {
    blocks.push({
      type: "paragraph",
      text: `${introParts.join(" ")}.`,
    });
  }

  if (config.submission_limit != null) {
    blocks.push({
      type: "paragraph",
      text: `This casting accepts up to ${config.submission_limit} submission${config.submission_limit === 1 ? "" : "s"}.`,
    });
  }

  const materials = config.submission_required_material_raws ?? [];
  if (materials.length) {
    blocks.push({
      type: "list",
      title: "Required materials",
      items: materials,
    });
  }

  const eligibility = (config.eligibility_raws ?? [])
    .map((raw) => labelFor(ELIGIBILITY_OPTIONS, raw))
    .filter(Boolean) as string[];
  if (eligibility.length) {
    blocks.push({
      type: "list",
      title: "Eligibility",
      items: eligibility,
    });
  }

  const questions = config.additional_submission_questions?.map((question) => question.prompt).filter(Boolean) ?? [];
  if (questions.length) {
    blocks.push({
      type: "list",
      title: "Additional questions",
      items: questions,
    });
  }

  if (config.self_tape?.prompt_instructions?.trim()) {
    blocks.push({
      type: "note",
      text: config.self_tape.prompt_instructions.trim(),
    });
  }

  if (config.self_tape?.slate_instructions?.trim()) {
    blocks.push({
      type: "paragraph",
      text: `Slate: ${config.self_tape.slate_instructions.trim()}`,
    });
  }

  if (!blocks.length) return null;

  return {
    title: "How to apply",
    blocks,
  };
}

function buildRoleSummary(role: CastingComposerForm["roles"][number]): string | null {
  const sentences: string[] = [];
  const count = Number.parseInt(role.peopleNeeded || "1", 10) || 1;
  const performerLabel = count === 1 ? "performer" : "performers";

  let opener = `Seeking ${count} ${performerLabel}`;
  if (role.gender?.trim()) {
    opener += ` (${role.gender.trim()})`;
  }
  sentences.push(`${opener}.`);

  const ageMin = role.ageRangeMin?.trim();
  const ageMax = role.ageRangeMax?.trim();
  if (ageMin || ageMax) {
    sentences.push(`Age range: ${[ageMin, ageMax].filter(Boolean).join("–")}.`);
  }

  if (role.specialSkills.length) {
    sentences.push(`Looking for ${role.specialSkills.join(", ")}.`);
  }

  const heightMin = role.heightMin?.trim();
  const heightMax = role.heightMax?.trim();
  if (heightMin || heightMax) {
    sentences.push(`Height: ${[heightMin, heightMax].filter(Boolean).join("–")}.`);
  }

  if (role.unionStatus?.trim()) {
    sentences.push(`${role.unionStatus.trim()} role.`);
  }

  if (role.agencyRequired) {
    sentences.push("Agency representation required.");
  }

  if (role.ethnicityPreferences.length) {
    sentences.push(`Casting notes: ${role.ethnicityPreferences.join(", ")}.`);
  }

  return sentences.join(" ");
}

function buildCastingTypeLabel(form: CastingComposerForm): string | null {
  const config = form.configuration;
  if (config.casting_kinds?.length) {
    return config.casting_kinds
      .map((kind) => labelFor(CASTING_KIND_OPTIONS, kind) ?? labelFromSnake(kind))
      .join(", ");
  }
  if (config.casting_kind) {
    return labelFor(CASTING_KIND_OPTIONS, config.casting_kind) ?? labelFromSnake(config.casting_kind);
  }
  return null;
}

export function buildCastingBreakdownDocument(
  form: CastingComposerForm,
  casting: CastingProject,
  workflowRoles: CastingRole[] = [],
  projectId?: string,
): CastingBreakdownDocument {
  const config = form.configuration;
  const castingType = buildCastingTypeLabel(form);
  const visibility =
    labelFor(VISIBILITY_OPTIONS, form.visibility) ?? castingVisibilityLabel(casting.visibility);
  const deadline =
    formatCastingDeadline(casting.submissionDeadline ?? config.submission_deadline_iso8601 ?? null) ??
    formatDateTime(config.submission_deadline_iso8601);

  const byline = [
    castingType,
    visibility,
    joinLocationParts([config.location_city || form.location || casting.location]),
    deadline ? `Due ${deadline}` : null,
    labelFromSnake(casting.status),
  ].filter(Boolean) as string[];

  const intro = form.description?.trim() || casting.description?.trim() || undefined;

  const sections = [
    buildLocationSection(form),
    buildCompensationSection(form),
    buildSubmissionSection(form),
  ].filter(Boolean) as CastingBreakdownDocumentSection[];

  const workflowRoleById = new Map(workflowRoles.map((role) => [role.id, role]));
  const workflowRoleByTitle = new Map(
    workflowRoles.map((role) => [role.name.trim().toLowerCase(), role]),
  );

  const roles: CastingBreakdownDocumentRole[] = form.roles.map((role) => {
    const workflowRole =
      workflowRoleById.get(role.id ?? role.clientId) ??
      workflowRoleByTitle.get(role.title.trim().toLowerCase());

    const pipeline = workflowRole
      ? `${workflowRole.candidateCount ?? 0} candidates · ${workflowRole.shortlistCount ?? 0} shortlisted · ${workflowRole.confirmedCount ?? 0} confirmed`
      : undefined;

    return {
      id: role.id || role.clientId,
      title: role.title || "Untitled role",
      description: role.description?.trim() || workflowRole?.description?.trim() || undefined,
      summary: buildRoleSummary(role) ?? undefined,
      pipeline,
      reviewHref:
        projectId && workflowRole
          ? castingWorkspaceHref(projectId, "review", {
              roleId: workflowRole.bridgedRoleId ?? workflowRole.id,
            })
          : undefined,
    };
  });

  return {
    title: form.title || casting.title || "Untitled casting",
    byline,
    intro,
    sections,
    roles,
    readiness: [
      { label: "Casting title", ok: Boolean((form.title || casting.title)?.trim()) },
      { label: "At least one role", ok: roles.length > 0 && roles.every((role) => role.title.trim()) },
      { label: "Published", ok: casting.status === "published" },
    ],
  };
}

/** Build a prose breakdown document from a create/edit form (no published project yet). */
export function buildCastingBreakdownDocumentFromForm(form: CastingComposerForm): CastingBreakdownDocument {
  const stub: CastingProject = {
    id: form.castingId ?? "draft",
    projectId: form.projectId ?? "draft",
    title: form.title || "Untitled casting",
    description: form.description,
    location: form.location || undefined,
    submissionDeadline: form.configuration.submission_deadline_iso8601 ?? undefined,
    status: "draft",
    visibility:
      form.visibility === "private"
        ? "private"
        : form.visibility === "unlisted"
          ? "invitation_only"
          : form.visibility === "public"
            ? "public"
            : "public",
    allowExternalCandidates: form.configuration.allow_external_invites,
    allowMultipleRoleSubmissions: true,
    createdBy: "",
    createdAt: "",
    updatedAt: "",
  };

  const document = buildCastingBreakdownDocument(form, stub);
  const hasLocation = Boolean(form.location.trim() || form.configuration.location_city?.trim());
  const hasCastingType = Boolean(
    form.configuration.casting_kinds.length > 0 || form.configuration.casting_kind,
  );
  const hasRoles =
    form.roles.length > 0 && form.roles.every((role) => role.title.trim());

  return {
    ...document,
    readiness: [
      { label: "Casting title", ok: Boolean(form.title.trim()) },
      { label: "Casting type", ok: hasCastingType },
      { label: "Location", ok: hasLocation },
      { label: "At least one role", ok: hasRoles },
    ],
  };
}
