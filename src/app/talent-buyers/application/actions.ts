"use server";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateIndustryApplication, type IndustryApplicationDetails } from "@/lib/talent-buyers/industry-application";
export async function submitIndustryApplication(details: IndustryApplicationDetails, version: number) {
  const validation = validateIndustryApplication(details);
  if (validation) return { ok: false, error: validation };
  const db = await createServerSupabaseClient();
  if (!db) return { ok: false, error: "Applications are unavailable. Please try again." };
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to submit your application." };
  const { error } = await db.rpc("submit_industry_application", {
    p_full_name: details.full_name.trim(), p_professional_role: details.professional_role.trim(),
    p_organization: details.organization.trim(), p_contact_email: details.contact_email.trim(),
    p_work_url: details.work_url.trim(), p_hiring_projects: details.hiring_projects.trim(), p_expected_version: version,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/talent-buyers/application");
  return { ok: true };
}
