"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { birthDateError } from "@/lib/onboarding/birth-date";
import { uploadOnboardingHeadshots } from "@/app/onboarding/media-actions";

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
    const [profile, role] = await Promise.all([
      client.from("profiles").select("first_name,last_name,date_of_birth,headshot_urls,resume_url,onboarding_completed_at,representation").eq("user_id", user.id).maybeSingle(),
      client.from("roles").select("slate_required,max_submission_links,agency_required").eq("id", roleId).single(),
    ]);
    if (profile.error || role.error) throw new Error("Couldn’t load your submission. Please try again.");
    return { ok: true as const, profile: profile.data, role: role.data, email: user.email };
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Couldn’t load submission." }; }
}

export async function completeCastingApplication(roleId: string, form: FormData) {
  try {
    const { client, user } = await authenticated();
    const existing = await client.from("profiles").select("headshot_urls,headshot_original_urls,resume_url,onboarding_completed_at,account_type").eq("user_id", user.id).maybeSingle();
    if (existing.error) throw existing.error;
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const firstName = text("firstName"), lastName = text("lastName"), dateOfBirth = text("dateOfBirth");
    if (!firstName || !lastName) throw new Error("Enter your first and last name.");
    const dateError = birthDateError(dateOfBirth);
    if (dateError) throw new Error(dateError);
    let headshots: string[] = existing.data?.headshot_urls ?? [];
    let originals: string[] = existing.data?.headshot_original_urls ?? [];
    const photo = form.get("headshot");
    if (photo instanceof File && photo.size) {
      if (photo.size > 6 * 1024 * 1024) throw new Error("Choose a headshot under 6 MB.");
      const upload = new FormData(); upload.set("files", photo);
      const result = await uploadOnboardingHeadshots(upload);
      if (!result.ok) throw new Error(result.error);
      headshots = [...result.headshotUrls, ...headshots].slice(0, 4);
      originals = [...result.headshotOriginalUrls, ...originals].slice(0, 4);
    }
    if (!headshots.length) throw new Error("Add a headshot so casting can recognize you.");
    let resumeURL: string | null = existing.data?.resume_url ?? null;
    const resume = form.get("resume");
    if (resume instanceof File && resume.size) {
      if (resume.type !== "application/pdf" || resume.size > 8 * 1024 * 1024) throw new Error("Upload a PDF résumé under 8 MB.");
      const path = `${user.id.toLowerCase()}/casting-resume-${crypto.randomUUID()}.pdf`;
      const { error } = await client.storage.from("resumes").upload(path, resume, { contentType: "application/pdf" });
      if (error) throw error;
      resumeURL = client.storage.from("resumes").getPublicUrl(path).data.publicUrl;
    }
    if (!existing.data?.onboarding_completed_at && !resumeURL) throw new Error("Add a résumé for the casting team. You can import your credits later.");
    const { error: saveError } = await client.from("profiles").upsert({
      user_id: user.id, email: user.email, first_name: firstName, last_name: lastName,
      display_name: `${firstName} ${lastName}`, date_of_birth: dateOfBirth,
      headshot_urls: headshots, headshot_original_urls: originals, resume_url: resumeURL,
      account_type: existing.data?.account_type ?? "talent", representation: text("representation") || null,
    }, { onConflict: "user_id" });
    if (saveError) throw saveError;
    const links = text("links").split(/\r?\n/).map(url => url.trim()).filter(Boolean);
    const slate = text("slate");
    const { data, error } = await client.rpc("create_casting_submission", {
      p_role_id: roleId, p_application_source: "native", p_talent_id: user.id,
      p_note: text("note") || null, p_slate_url: slate || null, p_slate_source: slate ? "link" : null,
      p_submission_links: links,
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.message || "Couldn’t submit. Please try again.");
    return { ok: true as const };
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Couldn’t submit. Your saved details are still available." }; }
}
