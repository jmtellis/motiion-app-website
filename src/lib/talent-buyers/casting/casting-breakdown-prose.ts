import {
  CASTING_KIND_OPTIONS,
  COMPENSATION_CATEGORY_OPTIONS,
  LOCATION_MODE_OPTIONS,
  RATE_TYPE_OPTIONS,
  SUBMISSION_METHOD_OPTIONS,
  SUBMITTER_POLICY_OPTIONS,
  VISIBILITY_OPTIONS,
  VISIBILITY_PRESENTATION_OPTIONS,
  ELIGIBILITY_OPTIONS,
} from "@/lib/talent-buyers/casting-composer-defaults";
import { resolveAuditionLocation } from "@/lib/talent-buyers/casting/casting-schedule";
import { labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import { formatCastingDeadline } from "@/lib/publicCasting";
import type { CastingComposerForm, CastingConfiguration } from "@/types/casting";

export type CastingBreakdownProseBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; title?: string; items: string[] }
  | { type: "note"; text: string };

export type CastingBreakdownProseSection = {
  title: string;
  blocks: CastingBreakdownProseBlock[];
};

function labelFor<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? labelFromSnake(value);
}

function isEmptyValue(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  const normalized = trimmed.toLowerCase();
  return normalized === "—" || normalized === "-" || normalized === "tbd" || normalized === "n/a";
}

function usable(value: string | null | undefined): string | null {
  if (isEmptyValue(value)) return null;
  return value!.trim();
}

function sentence(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim().replace(/[.;,:]+$/, "");
  if (!cleaned) return "";
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}.`;
}

/** Join already-punctuated sentences into a single flowing paragraph. */
function joinSentences(parts: (string | null | undefined)[]): string | null {
  const sentences = parts
    .map((part) => part?.replace(/\s+/g, " ").trim())
    .filter((part): part is string => Boolean(part))
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`));
  if (!sentences.length) return null;
  return sentences.join(" ");
}

function joinWithAnd(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function lowercaseLead(value: string): string {
  if (!value) return value;
  // Preserve acronyms / proper-looking labels (Motiion, TV, etc.).
  if (/^[A-Z]{2,}/.test(value) || /^[A-Z][a-z]+[A-Z]/.test(value)) return value;
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return usable(value);
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

function formatYyyymmdd(value: string): string {
  if (value.includes("-")) return value;
  if (value.length !== 8) return value;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function joinLocationParts(parts: (string | null | undefined)[]): string | null {
  const filtered = parts.map((part) => usable(part)).filter(Boolean) as string[];
  if (!filtered.length) return null;
  return filtered.join(", ");
}

function castingKinds(form: CastingComposerForm): string[] {
  const config = form.configuration;
  if (config.casting_kinds?.length) return config.casting_kinds;
  if (config.casting_kind) return [config.casting_kind];
  return [];
}

function buildCastingTypeLabel(form: CastingComposerForm): string | null {
  const kinds = castingKinds(form);
  if (!kinds.length) return null;
  return kinds
    .map((kind) => labelFor(CASTING_KIND_OPTIONS, kind) ?? labelFromSnake(kind))
    .join(", ");
}

function formatScheduleRanges(config: CastingConfiguration): string[] {
  const lines: string[] = [];
  const productionDates = (config.production_dates_yyyymmdd ?? []).map(formatYyyymmdd);
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
        .map((value) => formatDateTime(formatYyyymmdd(value)) ?? formatYyyymmdd(value))
        .join(", ");
      lines.push(`${label} is scheduled for ${days}`);
    }
  } else if (productionDates.length) {
    lines.push(
      `Production is scheduled for ${productionDates
        .map((value) => formatDateTime(value) ?? value)
        .join(", ")}`,
    );
  } else if (production.length) {
    const ranges = production
      .map((range) => formatDateRange(range.start_yyyymmdd, range.end_yyyymmdd))
      .filter(Boolean);
    if (ranges.length) lines.push(`Production runs ${ranges.join(", ")}`);
  }

  if (!categories.length && rehearsal.length) {
    const ranges = rehearsal
      .map((range) => formatDateRange(range.start_yyyymmdd, range.end_yyyymmdd))
      .filter(Boolean);
    if (ranges.length) lines.push(`Rehearsal runs ${ranges.join(", ")}`);
  }

  if (sessions.length) {
    for (const session of sessions) {
      const audition = formatDateTime(session.datetime_iso8601) ?? session.datetime_iso8601;
      const title = session.title?.trim() || "Audition";
      if (session.has_callback && session.callback_datetime_iso8601) {
        const callback =
          formatDateTime(session.callback_datetime_iso8601) ?? session.callback_datetime_iso8601;
        lines.push(`${title} is ${audition}, with callbacks on ${callback}`);
      } else if (audition) {
        lines.push(`${title} is ${audition}`);
      }
    }
  }

  return lines;
}

function submissionMethodPhrase(raw: string | null | undefined): string | null {
  if (!raw) return null;
  switch (raw) {
    case "in_app":
    case "submit_through_motiion":
      return "through Motiion";
    case "external_link":
      return "via an external link";
    case "email":
      return "by email";
    case "agency_only":
      return "through agencies only";
    case "invite_only":
      return "by invitation only";
    default: {
      const label = labelFor(SUBMISSION_METHOD_OPTIONS, raw);
      return label ? `via ${lowercaseLead(label)}` : null;
    }
  }
}

function submitterPolicyPhrase(raw: string | null | undefined): string | null {
  if (!raw) return null;
  switch (raw) {
    case "any_viewer":
      return "open to anyone who can view the casting";
    case "invited_only":
      return "limited to invited talent";
    case "represented_only":
      return "limited to represented talent";
    case "roster_only":
      return "limited to roster talent";
    default: {
      const label = labelFor(SUBMITTER_POLICY_OPTIONS, raw);
      return label ? lowercaseLead(label) : null;
    }
  }
}

function visibilitySentence(form: CastingComposerForm): string | null {
  if (form.visibility === "private") {
    return sentence("This breakdown is private and visible only to invited talent");
  }
  if (form.visibility === "public") {
    return sentence("This casting is listed as an open call");
  }
  const label = labelFor(VISIBILITY_OPTIONS, form.visibility);
  return label ? sentence(`Visibility is set to ${lowercaseLead(label)}`) : null;
}

export function buildOverviewSection(form: CastingComposerForm): CastingBreakdownProseSection | null {
  const description = usable(form.description);
  if (!description) return null;
  return {
    title: "Overview",
    blocks: [{ type: "paragraph", text: description }],
  };
}

export function buildProductionScheduleSection(
  form: CastingComposerForm,
): CastingBreakdownProseSection | null {
  const config = form.configuration;
  const clauses: string[] = [];

  const locationMode = labelFor(LOCATION_MODE_OPTIONS, config.location_mode_raw);
  if (locationMode && locationMode.toLowerCase() !== "in person") {
    clauses.push(sentence(`This production is ${lowercaseLead(locationMode)}`));
  } else if (locationMode) {
    clauses.push(sentence("This production is in person"));
  }

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
        const dayList = group.day_locations
          .map((entry) => {
            const date = formatYyyymmdd(entry.date_yyyymmdd);
            const place = usable(entry.location_label) || usable(entry.location_venue) || "TBD";
            return `${date} at ${place}`;
          })
          .join("; ");
        clauses.push(sentence(`${label} locations vary by day: ${dayList}`));
        continue;
      }
      if (usable(group.location_label)) {
        clauses.push(sentence(`${label} takes place at ${group.location_label!.trim()}`));
      }
    }
  } else {
    const dayLocations = config.production_day_locations ?? [];
    if (config.production_location_scope_raw === "per_day" && dayLocations.length > 0) {
      const dayList = dayLocations
        .map((entry) => {
          const date = formatYyyymmdd(entry.date_yyyymmdd);
          const place = usable(entry.location_label) || usable(entry.location_venue) || "TBD";
          return `${date} at ${place}`;
        })
        .join("; ");
      clauses.push(sentence(`Production locations vary by day: ${dayList}`));
    } else {
      const place = joinLocationParts([
        config.location_venue,
        config.location_city || form.location,
        config.location_region,
        config.location_country,
      ]);
      if (place || usable(form.location)) {
        clauses.push(sentence(`Production takes place in ${place || form.location.trim()}`));
      }
    }
  }

  if (config.local_hire_only) {
    clauses.push(sentence("Local hire only"));
  }
  if (config.travel_required_for_locations) {
    clauses.push(sentence("Travel is required for this production"));
  }

  const auditionSessions = (config.audition_sessions ?? []).filter((session) =>
    Boolean(session.datetime_iso8601),
  );
  for (const session of auditionSessions) {
    const title = session.title?.trim() || "Audition";
    const resolved = resolveAuditionLocation(session, form);
    if (resolved.mode === "remote") {
      clauses.push(
        resolved.remoteUrl
          ? sentence(`${title} is remote (${resolved.remoteUrl})`)
          : sentence(`${title} is remote`),
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
      clauses.push(sentence(`${title} is held at ${detail}`));
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

  for (const line of scheduleLines) {
    clauses.push(sentence(line));
  }
  if (audition) clauses.push(sentence(`Auditions are on ${audition}`));
  if (callback) clauses.push(sentence(`Callbacks are on ${callback}`));

  const paragraph = joinSentences(clauses);
  if (!paragraph) return null;

  return {
    title: "Production and schedule",
    blocks: [{ type: "paragraph", text: paragraph }],
  };
}

export function buildCompensationProseSection(
  form: CastingComposerForm,
): CastingBreakdownProseSection | null {
  const config = form.configuration;
  const clauses: string[] = [];

  const category = labelFor(COMPENSATION_CATEGORY_OPTIONS, config.compensation_category_raw);
  const rateType = labelFor(RATE_TYPE_OPTIONS, form.rateType);
  const usableCategory = category && !isEmptyValue(category) ? category : null;
  const usableRate =
    rateType && !isEmptyValue(rateType) ? lowercaseLead(rateType.replace(/\s+rate$/i, " rate")) : null;

  const leadBits: string[] = [];
  if (usableRate) leadBits.push(usableRate);
  else if (usableCategory) leadBits.push(lowercaseLead(usableCategory));

  if (leadBits.length || form.isUnion != null) {
    let lead = leadBits.length
      ? `Compensation is ${leadBits.join(", ")}`
      : "Compensation details are available";
    if (form.isUnion === true) lead += " under a union contract";
    else if (form.isUnion === false) lead += " for a non-union engagement";
    if (usableCategory && usableRate && usableCategory.toLowerCase() !== "paid") {
      lead += ` (${lowercaseLead(usableCategory)})`;
    }
    clauses.push(sentence(lead));
  }

  const notes = usable(config.compensation_amount_notes);
  if (notes) clauses.push(notes.endsWith(".") ? notes : sentence(notes));

  const coverage = (config.compensation_coverage_raws ?? [])
    .map((item) => usable(item))
    .filter(Boolean) as string[];
  if (coverage.length) {
    const normalized = coverage.map((item) => {
      const lower = item.toLowerCase();
      if (lower.endsWith(" covered")) return lowercaseLead(item);
      if (lower.endsWith(" provided")) return lowercaseLead(item);
      return lowercaseLead(item);
    });
    clauses.push(sentence(`Coverage includes ${joinWithAnd(normalized)}`));
  }

  const paragraph = joinSentences(clauses);
  if (!paragraph) return null;
  return {
    title: "Compensation",
    blocks: [{ type: "paragraph", text: paragraph }],
  };
}

export function buildHowToApplySection(form: CastingComposerForm): CastingBreakdownProseSection | null {
  const config = form.configuration;
  const blocks: CastingBreakdownProseBlock[] = [];

  const method = submissionMethodPhrase(config.submission_method_raw);
  const policy = submitterPolicyPhrase(config.submitter_policy_raw);
  const presentation = labelFor(VISIBILITY_PRESENTATION_OPTIONS, config.visibility_presentation_raw);
  const deadline =
    formatCastingDeadline(config.submission_deadline_iso8601 ?? null) ??
    formatDateTime(config.submission_deadline_iso8601);

  const introBits: string[] = [];
  if (method) introBits.push(`Submissions are accepted ${method}`);
  if (policy) {
    if (introBits.length) introBits[0] = `${introBits[0]} and are ${policy}`;
    else introBits.push(`Submissions are ${policy}`);
  } else if (presentation && presentation.toLowerCase() !== "public listing") {
    if (introBits.length) {
      introBits[0] = `${introBits[0]} (${lowercaseLead(presentation)})`;
    } else {
      introBits.push(`Submissions are ${lowercaseLead(presentation)}`);
    }
  }

  const flowing: string[] = [];
  if (introBits.length) flowing.push(sentence(introBits.join(" ")));
  if (deadline) flowing.push(sentence(`The deadline is ${deadline}`));
  if (config.submission_limit != null) {
    flowing.push(
      sentence(
        `This casting accepts up to ${config.submission_limit} submission${
          config.submission_limit === 1 ? "" : "s"
        }`,
      ),
    );
  }

  const introParagraph = joinSentences(flowing);
  if (introParagraph) {
    blocks.push({ type: "paragraph", text: introParagraph });
  }

  const materials = (config.submission_required_material_raws ?? [])
    .map((item) => usable(item))
    .filter(Boolean) as string[];
  if (materials.length) {
    blocks.push({
      type: "list",
      title: "Required materials",
      items: materials,
    });
  }

  const eligibility = (config.eligibility_raws ?? [])
    .map((raw) => labelFor(ELIGIBILITY_OPTIONS, raw))
    .filter((item): item is string => Boolean(item && !isEmptyValue(item)));
  if (eligibility.length) {
    blocks.push({
      type: "list",
      title: "Eligibility",
      items: eligibility,
    });
  }

  const questions =
    config.additional_submission_questions
      ?.map((question) => usable(question.prompt))
      .filter(Boolean) ?? [];
  if (questions.length) {
    blocks.push({
      type: "list",
      title: "Additional questions",
      items: questions as string[],
    });
  }

  const selfTape = usable(config.self_tape?.prompt_instructions);
  if (selfTape) {
    blocks.push({ type: "note", text: selfTape });
  }

  const slate = usable(config.self_tape?.slate_instructions);
  if (slate) {
    blocks.push({ type: "paragraph", text: sentence(`Slate instructions: ${slate}`) });
  }

  if (!blocks.length) return null;
  return { title: "How to apply", blocks };
}

export function buildCastingSettingsSection(
  form: CastingComposerForm,
): CastingBreakdownProseSection | null {
  const visibility = visibilitySentence(form);
  if (!visibility) return null;
  return {
    title: "Casting settings",
    blocks: [{ type: "paragraph", text: visibility }],
  };
}

export function buildCastingBreakdownProseSections(
  form: CastingComposerForm,
): CastingBreakdownProseSection[] {
  return [
    buildOverviewSection(form),
    buildProductionScheduleSection(form),
    buildCompensationProseSection(form),
    buildHowToApplySection(form),
    buildCastingSettingsSection(form),
  ].filter(Boolean) as CastingBreakdownProseSection[];
}

export { buildCastingTypeLabel, formatDateTime, joinLocationParts };
