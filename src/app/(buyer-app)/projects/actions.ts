"use server";

import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import {
  buildProjectInsertRow,
  buildRoleInsertRow,
  buildRpcProjectPayload,
  buildRpcRolesPayload,
  mapRpcErrorMessage,
} from "@/lib/talent-buyers/casting-payload";
import {
  parseCastingComposerForm,
  parseCastingDraftForm,
} from "@/lib/talent-buyers/casting-schema";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseRpc } from "@/lib/supabase/rpc";
import type {
  PublishCastingResult,
  SaveCastingDraftResult,
} from "@/types/casting";

type RpcCastingResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  project?: { id?: string };
  roles?: Array<{ id?: string }>;
};

async function requirePosterSession() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false as const, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "You must be signed in to manage castings." };
  }

  return { ok: true as const, supabase, userId: user.id };
}

async function rollbackDraftProject(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  projectId: string,
) {
  await supabase.from("roles").delete().eq("project_id", projectId);
  await supabase.from("projects").delete().eq("id", projectId);
}

async function replaceProjectRoles(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  posterId: string,
  projectId: string,
  form: NonNullable<ReturnType<typeof parseCastingComposerForm>["data"]>,
  isDraft: boolean,
) {
  await supabase.from("roles").delete().eq("project_id", projectId);

  const roleIds: string[] = [];
  for (const role of form.roles) {
    const { data: insertedRole, error: roleError } = await supabase
      .from("roles")
      .insert(buildRoleInsertRow(posterId, projectId, form, role, isDraft))
      .select("id")
      .single();

    if (roleError || !insertedRole?.id) {
      return { ok: false as const, error: roleError?.message ?? "Failed to save role." };
    }

    roleIds.push(insertedRole.id as string);
  }

  return { ok: true as const, roleIds };
}

export async function saveCastingDraft(payload: unknown): Promise<SaveCastingDraftResult> {
  const parsed = parseCastingDraftForm(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your casting details.",
    };
  }

  const session = await requirePosterSession();
  if (!session.ok) {
    return { ok: false, error: session.error };
  }

  const { supabase, userId } = session;
  const form = parsed.data;
  const projectRow = buildProjectInsertRow(userId, form, true);

  if (form.projectId) {
    const { data: existingProject, error: existingError } = await supabase
      .from("projects")
      .select("id, poster_id")
      .eq("id", form.projectId)
      .eq("poster_id", userId)
      .maybeSingle();

    if (existingError || !existingProject) {
      return { ok: false, error: "Draft casting not found." };
    }

    const { error: updateError } = await supabase
      .from("projects")
      .update(projectRow)
      .eq("id", form.projectId);

    if (updateError) {
      return { ok: false, error: updateError.message };
    }

    const rolesResult = await replaceProjectRoles(supabase, userId, form.projectId, form, true);
    if (!rolesResult.ok) {
      return { ok: false, error: rolesResult.error };
    }

    revalidateCastingPaths(form.projectId);
    return { ok: true, projectId: form.projectId, roleIds: rolesResult.roleIds };
  }

  const { data: insertedProject, error: insertError } = await supabase
    .from("projects")
    .insert(projectRow)
    .select("id")
    .single();

  if (insertError || !insertedProject?.id) {
    return { ok: false, error: insertError?.message ?? "Failed to save draft." };
  }

  const projectId = insertedProject.id as string;
  const rolesResult = await replaceProjectRoles(supabase, userId, projectId, form, true);
  if (!rolesResult.ok) {
    await rollbackDraftProject(supabase, projectId);
    return { ok: false, error: rolesResult.error };
  }

  revalidateCastingPaths(projectId);
  return { ok: true, projectId, roleIds: rolesResult.roleIds };
}

export async function publishCasting(payload: unknown): Promise<PublishCastingResult> {
  const parsed = parseCastingComposerForm(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your casting details.",
    };
  }

  const session = await requirePosterSession();
  if (!session.ok) {
    return { ok: false, error: session.error };
  }

  const form = parsed.data;
  const rpcProject = buildRpcProjectPayload(form, false);
  const rpcRoles = buildRpcRolesPayload(form, false);

  const { data, error } = await supabaseRpc<RpcCastingResponse>("create_casting_project", {
    p_project: rpcProject,
    p_roles: rpcRoles,
  });

  if (error) {
    return { ok: false, error };
  }

  if (!data?.ok) {
    return {
      ok: false,
      code: data?.code,
      error: mapRpcErrorMessage(data?.code, data?.message),
    };
  }

  const projectId = data.project?.id;
  const roleIds = (data.roles ?? [])
    .map((role) => role.id)
    .filter((id): id is string => Boolean(id));

  if (!projectId) {
    return { ok: false, error: "Casting published, but no project id was returned." };
  }

  if (form.projectId && form.projectId !== projectId) {
    const { supabase } = session;
    await rollbackDraftProject(supabase, form.projectId);
  }

  await trackServerEvent("casting_created", {
    project_id: projectId,
    role_count: roleIds.length,
  });

  revalidateCastingPaths(projectId);
  return {
    ok: true,
    projectId,
    roleIds,
    publicRoleId: roleIds[0],
  };
}

export async function updatePublishedCasting(payload: unknown): Promise<PublishCastingResult> {
  const parsed = parseCastingComposerForm(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your casting details.",
    };
  }

  if (!parsed.data.projectId) {
    return publishCasting(payload);
  }

  const session = await requirePosterSession();
  if (!session.ok) {
    return { ok: false, error: session.error };
  }

  const { supabase, userId } = session;
  const form = parsed.data;
  const projectId = form.projectId;

  if (!projectId) {
    return publishCasting(payload);
  }

  const projectRow = buildProjectInsertRow(userId, form, false);

  const { data: existingProject, error: existingError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("poster_id", userId)
    .maybeSingle();

  if (existingError || !existingProject) {
    return { ok: false, error: "Casting not found." };
  }

  const { error: updateError } = await supabase
    .from("projects")
    .update(projectRow)
    .eq("id", projectId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const rolesResult = await replaceProjectRoles(supabase, userId, projectId, form, false);
  if (!rolesResult.ok) {
    return { ok: false, error: rolesResult.error };
  }

  revalidateCastingPaths(projectId);
  return {
    ok: true,
    projectId,
    roleIds: rolesResult.roleIds,
    publicRoleId: rolesResult.roleIds[0],
  };
}

function revalidateCastingPaths(projectId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/events");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/edit`);
}
