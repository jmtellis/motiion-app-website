import type { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildProjectColumnsFromComposer,
  normalizeCastingConfigurationForMobile,
} from "@/lib/talent-buyers/casting/casting-configuration-mobile";
import type { ParsedCastingComposerForm } from "@/lib/talent-buyers/casting-schema";
import { isComposableProject } from "@/lib/talent-buyers/project-abilities";
import type { CastingAttachmentCodable, CastingConfiguration } from "@/types/casting";

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

type ExistingProjectShell = {
  casting_configuration: Record<string, unknown> | null;
  project_configuration: Record<string, unknown> | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
};

async function fetchExistingProjectShell(
  supabase: SupabaseClient,
  projectId: string,
): Promise<ExistingProjectShell | null> {
  const { data } = await supabase
    .from("projects")
    .select("casting_configuration, project_configuration, location, start_date, end_date, cover_image_url")
    .eq("id", projectId)
    .maybeSingle<ExistingProjectShell>();
  return data ?? null;
}

/**
 * A composable shell owns its name, cover, city, dates, and active state; the
 * Casting ability may only fill shell fields that are still empty, and the row
 * stays private until the casting itself is published.
 */
function protectComposableShellColumns(
  updates: Record<string, unknown>,
  shell: ExistingProjectShell,
  isDraft: boolean,
) {
  delete updates.title;
  delete updates.is_active;
  delete updates.cover_thumbnail_alignment;
  if (shell.cover_image_url) delete updates.cover_image_url;
  if (shell.location) delete updates.location;
  if (shell.start_date || shell.end_date) {
    delete updates.start_date;
    delete updates.end_date;
  }
  if (isDraft) delete updates.visibility;
}

/** Keep projects.casting_configuration in sync with child castings for mobile detail/submit. */
export async function syncProjectCastingConfiguration(
  supabase: SupabaseClient,
  projectId: string,
  configuration: CastingConfiguration | null | undefined,
  isDraft: boolean,
  form?: ParsedCastingComposerForm,
): Promise<void> {
  if (!configuration && !form) return;

  const shell = await fetchExistingProjectShell(supabase, projectId);
  const existing = shell?.casting_configuration ?? null;
  const existingAttachments = Array.isArray(existing?.attachments)
    ? (existing.attachments as CastingAttachmentCodable[])
    : [];

  const casting_configuration = form
    ? normalizeCastingConfigurationForMobile(form, isDraft, {
        preserveAttachments: existingAttachments,
      })
    : {
        ...configuration!,
        // Preserve Files-tab attachments when syncing from child casting rows without form context.
        attachments:
          (configuration?.attachments?.length ? configuration.attachments : existingAttachments) ?? [],
        composer_draft: isDraft,
      };

  const updates: Record<string, unknown> = {
    casting_configuration,
  };

  if (form) {
    Object.assign(
      updates,
      buildProjectColumnsFromComposer({
        ...form,
        configuration: casting_configuration,
      }),
    );
  }

  if (shell && isComposableProject(shell)) {
    protectComposableShellColumns(updates, shell, isDraft);
  }

  await supabase.from("projects").update(updates).eq("id", projectId);
}

/** Load configuration from a child casting row and sync to the parent project. */
export async function syncProjectCastingConfigurationFromCastingId(
  supabase: SupabaseClient,
  projectId: string,
  castingId: string,
  isDraft: boolean,
  form?: ParsedCastingComposerForm,
): Promise<void> {
  if (form) {
    await syncProjectCastingConfiguration(supabase, projectId, form.configuration, isDraft, form);
    return;
  }

  const [{ data }, { data: project }] = await Promise.all([
    supabase
      .from("castings")
      .select("configuration, title, description, visibility, submission_deadline, status")
      .eq("id", castingId)
      .maybeSingle<{
        configuration: CastingConfiguration | null;
        title: string | null;
        description: string | null;
        visibility: string | null;
        submission_deadline: string | null;
        status: string | null;
      }>(),
    supabase
      .from("projects")
      .select(
        "title, description, production_company, production_company_logo_url, cover_image_url, location, start_date, end_date, rate_type, rate_details, casting_configuration, project_configuration",
      )
      .eq("id", projectId)
      .maybeSingle(),
  ]);

  if (!data?.configuration && !data?.title) return;

  // A composable shell is never a draft itself; publish state comes from its casting.
  if (project && isComposableProject(project)) {
    isDraft = !data.status || data.status === "draft";
  }

  const existingAttachments = Array.isArray(
    (project?.casting_configuration as CastingConfiguration | null)?.attachments,
  )
    ? ((project?.casting_configuration as CastingConfiguration).attachments ?? [])
    : [];

  const configuration: CastingConfiguration = {
    ...(data.configuration ?? ({} as CastingConfiguration)),
    submission_deadline_iso8601:
      data.configuration?.submission_deadline_iso8601 ?? data.submission_deadline ?? null,
    attachments: data.configuration?.attachments?.length
      ? data.configuration.attachments
      : existingAttachments,
    composer_draft: isDraft,
  };

  // Prefer a form-shaped sync so title/client/pay columns are written for iOS.
  const { childCastingToComposerForm } = await import("@/lib/talent-buyers/casting-child-payload");
  const formFromChild = childCastingToComposerForm(
    {
      id: castingId,
      project_id: projectId,
      title: data.title ?? project?.title ?? "Untitled casting",
      description: data.description ?? project?.description ?? null,
      visibility: data.visibility,
      password_hash: null,
      configuration,
      submission_deadline: data.submission_deadline,
      status: isDraft ? "draft" : "open",
      created_at: null,
    },
    [],
    projectId,
    [],
    project,
  );

  await syncProjectCastingConfiguration(supabase, projectId, configuration, isDraft, formFromChild);
}

export async function notifyCastingMatchesForRoles(
  supabase: SupabaseClient,
  roleIds: string[],
  options?: {
    /** When false, skip RPC fan-out (private / invite-only castings). */
    isPublicOpenCall?: boolean;
  },
): Promise<void> {
  if (options?.isPublicOpenCall === false) return;

  for (const roleId of roleIds) {
    await supabase.rpc("notify_casting_matches_for_role", { p_role_id: roleId });
  }
}
