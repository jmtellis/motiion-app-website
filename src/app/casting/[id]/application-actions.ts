"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { birthDateError } from "@/lib/onboarding/birth-date";
import { castingMediaError, isOwnedCastingMediaPath, prependCastingHeadshot, type CastingMediaKind } from "@/lib/casting/application-media";
import { castingApplicationMaterials, castingApplicationQuestions } from "@/lib/casting/application-requirements";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

async function requirements(client: SupabaseClient, roleId: string) {
  const role = await client.from("roles").select("project_id,slate_required,max_submission_links,agency_required").eq("id", roleId).single();
  if (role.error || !role.data) throw new Error("Couldn’t load the role requirements. Please try again.");
  const project = await client.from("projects").select("casting_configuration").eq("id", role.data.project_id).single();
  if (project.error) throw new Error("Couldn’t load the casting questions. Please try again.");
  return { role: role.data, questions: castingApplicationQuestions(project.data?.casting_configuration) };
}

async function authenticated() {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error("Submissions are temporarily unavailable.");
  const { data: { user } } = await client.auth.getUser();
  if (!user || user.is_anonymous || !user.email_confirmed_at) throw new Error("Verify your email before submitting.");
  return { client, user };
}

export async function loadCastingApplication(roleId: string) {
  try {
    const { client, user } = await authenticated();
    const [profile, loaded, submission] = await Promise.all([
      client.from("profiles").select("first_name,last_name,date_of_birth,headshot_urls,resume_url,onboarding_completed_at,representation").eq("user_id", user.id).maybeSingle(),
      requirements(client, roleId),
      client.from("submissions").select("id").eq("role_id", roleId).eq("talent_id", user.id).maybeSingle(),
    ]);
    if (profile.error || submission.error) throw new Error("Couldn’t load your submission. Please try again.");
    return { ok: true as const, profile: profile.data, ...loaded, email: user.email, userId: user.id, submitted: Boolean(submission.data) };
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Couldn’t load submission." }; }
}

export async function completeCastingApplication(roleId: string, form: FormData) {
  try {
    const { client, user } = await authenticated();
    const [existing, loaded] = await Promise.all([
      client.from("profiles").select("headshot_urls,headshot_original_urls,resume_url,onboarding_completed_at,account_type").eq("user_id", user.id).maybeSingle(),
      requirements(client, roleId),
    ]);
    if (existing.error) throw existing.error;
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const uploadedURL = async (path: string, kind: CastingMediaKind) => {
      if (!isOwnedCastingMediaPath(path, user.id, kind)) throw new Error("Choose your file again before submitting.");
      const bucket = client.storage.from(kind === "resume" ? "resumes" : "headshots");
      const { data, error } = await bucket.info(path);
      if (error || !data) throw new Error("Couldn’t verify your uploaded file. Please choose it again.");
      const message = castingMediaError(kind, data.size, data.contentType);
      if (message) throw new Error(message);
      return bucket.getPublicUrl(path).data.publicUrl;
    };
    const firstName = text("firstName"), lastName = text("lastName"), dateOfBirth = text("dateOfBirth");
    if (!firstName || !lastName) throw new Error("Enter your first and last name.");
    const dateError = birthDateError(dateOfBirth);
    if (dateError) throw new Error(dateError);
    const materials = castingApplicationMaterials(form, { slateRequired: loaded.role.slate_required === true, maxLinks: loaded.role.max_submission_links ?? 0, questions: loaded.questions });
    if (loaded.role.agency_required && !text("representation")) throw new Error("Add your agency or representation for this role.");
    let headshots: string[] = existing.data?.headshot_urls ?? [];
    let originals: string[] = existing.data?.headshot_original_urls ?? [];
    const photoPath = text("headshotPath"), originalPath = text("headshotOriginalPath");
    if (photoPath || originalPath) {
      const [display, original] = await Promise.all([uploadedURL(photoPath, "headshot"), uploadedURL(originalPath, "headshotOriginal")]);
      const merged = prependCastingHeadshot(headshots, originals, display, original);
      headshots = merged.headshots; originals = merged.originals;
    }
    if (!headshots.length) throw new Error("Add a headshot so casting can recognize you.");
    let resumeURL: string | null = existing.data?.resume_url ?? null;
    const resumePath = text("resumePath");
    if (resumePath) resumeURL = await uploadedURL(resumePath, "resume");
    if (!existing.data?.onboarding_completed_at && !resumeURL) throw new Error("Add a résumé for the casting team. You can import your credits later.");
    const { error: saveError } = await client.from("profiles").upsert({
      user_id: user.id, email: user.email, first_name: firstName, last_name: lastName,
      display_name: `${firstName} ${lastName}`, date_of_birth: dateOfBirth,
      headshot_urls: headshots, headshot_original_urls: originals, resume_url: resumeURL,
      account_type: existing.data?.account_type ?? "talent", representation: text("representation") || null,
    }, { onConflict: "user_id" });
    if (saveError) throw saveError;
    const { data, error } = await client.rpc("create_casting_submission", {
      p_role_id: roleId, p_application_source: "native", p_talent_id: user.id,
      p_note: text("note") || null, p_slate_url: materials.slate, p_slate_source: materials.slate ? "link" : null,
      p_submission_links: materials.links, p_supplemental_answers: materials.answers,
    });
    if (error) throw error;
    if (!data?.ok && data?.code !== "duplicate_submission") throw new Error(data?.message || "Couldn’t submit. Please try again.");
    for (const path of ["/opportunities", "/home", "/inbox", "/messages", `/casting/${loaded.role.project_id}`]) revalidatePath(path);
    return { ok: true as const };
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Couldn’t submit. Your saved details are still available." }; }
}
