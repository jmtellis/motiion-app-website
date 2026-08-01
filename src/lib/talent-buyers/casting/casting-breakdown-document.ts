import { VISIBILITY_OPTIONS } from "@/lib/talent-buyers/casting-composer-defaults";
import { castingVisibilityLabel } from "@/lib/talent-buyers/casting/casting-display";
import { labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import { formatCastingDeadline } from "@/lib/publicCasting";
import type { CastingComposerForm } from "@/types/casting";
import type { CastingProject, CastingRole } from "./casting-types";
import { castingWorkspaceHref } from "./casting-routes";
import {
  buildCastingBreakdownProseSections,
  buildCastingTypeLabel,
  formatDateTime,
  joinLocationParts,
  type CastingBreakdownProseBlock,
  type CastingBreakdownProseSection,
} from "./casting-breakdown-prose";

export { castingConfigurationToComposerForm } from "./casting-breakdown-sections";

export type CastingBreakdownBlock = CastingBreakdownProseBlock;

export type CastingBreakdownDocumentSection = CastingBreakdownProseSection;

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

  const sections = buildCastingBreakdownProseSections(form);

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
    (form.configuration.casting_kinds?.length ?? 0) > 0 || form.configuration.casting_kind,
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
