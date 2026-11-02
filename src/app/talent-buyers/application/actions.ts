"use server";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeIndustryWorkUrl, validateIndustryApplicationStep, type IndustryApplicationDraft } from "@/lib/talent-buyers/industry-application";
export async function submitIndustryApplication(details: IndustryApplicationDraft, version: number) {
  const validation = validateIndustryApplicationStep("review", details);
  if (validation) return { ok: false, error: validation };
  if (!Number.isSafeInteger(version) || version < 0) return { ok: false, error: "Refresh your application before submitting." };
  const db = await createServerSupabaseClient();
  if (!db) return { ok: false, error: "Applications are unavailable. Please try again." };
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to submit your application. Your draft is saved on this device." };
  const { error } = await db.rpc("submit_industry_application_with_identity", {
    p_full_name: details.full_name.trim(), p_professional_role: details.professional_role.trim(),
    p_organization: details.organization.trim(), p_contact_email: details.contact_email.trim(),
    p_work_url: normalizeIndustryWorkUrl(details.work_url), p_hiring_projects: details.hiring_projects.trim(), p_expected_version: version,
    p_username: details.username, p_date_of_birth: details.date_of_birth, p_avatar_url: details.avatar_url,
    p_acquisition_source: details.acquisition_source, p_acquisition_source_detail: details.acquisition_source_detail.trim() || null,
  });
  if (error) return { ok: false, error: ["PGRST202", "42883"].includes(error.code) ? "Applications need a service update. Your draft is saved; please try again shortly." : error.message };
  revalidatePath("/talent-buyers/application");
  revalidatePath("/talent-buyers/onboarding");
  return { ok: true };
}

export async function uploadIndustryApplicationPhoto(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const file = formData.get("photo");
  if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) return { ok: false, error: "Choose a JPG, PNG, or WebP photo under 8 MB." };
  const db = await createServerSupabaseClient();
  const { data } = db ? await db.auth.getUser() : { data: { user: null } };
  if (!db || !data.user) return { ok: false, error: "Sign in again before adding your photo." };
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${data.user.id}/industry_${crypto.randomUUID()}.${extension}`;
  const { error } = await db.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: "Couldn’t save your photo. Check your connection and try again." };
  return { ok: true, url: db.storage.from("avatars").getPublicUrl(path).data.publicUrl };
}
