import { z } from "zod";
import type { ProjectRecord } from "@/types/project";

export const projectSettingsSchema = z.object({
  title: z.string().trim().min(1, "Name your project.").max(120),
  description: z.string().max(10000),
  productionCompany: z.string().trim().max(255),
  productionCompanyLogoUrl: z.string().trim(),
  location: z.string().trim().max(255),
  coverImageUrl: z.string().trim(),
  startDate: z.string().date().or(z.literal("")),
  endDate: z.string().date().or(z.literal("")),
  datesNotConfirmed: z.boolean(),
  scheduleCategories: z.array(z.object({
    id_key: z.string(), activity_type_raw: z.string(), custom_schedule_title: z.string().nullish(),
    selected_days_yyyymmdd: z.array(z.string().regex(/^(\d{8}|\d{4}-\d{2}-\d{2})$/)),
  }).passthrough()).max(100),
}).refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { message: "End date must follow the start date.", path: ["endDate"] });
export type ProjectSettingsInput = z.infer<typeof projectSettingsSchema>;

/** Match the app's ProjectDetails fallback and preserve fields not edited by settings. */
export function projectDetailsFromRecord(project: ProjectRecord): Record<string, unknown> {
  const c = project.casting_configuration ?? {};
  return {
    title: project.title, description: project.description ?? "", production_company: project.production_company ?? "",
    production_company_logo_url: project.production_company_logo_url ?? null,
    confidential_client: c.confidential_project_client ?? false, casting_kinds: c.casting_kinds ?? [],
    location: project.location ?? c.location_city ?? "", compensation_category: c.compensation_category_raw ?? (project.rate_type && project.rate_type !== "tbd" ? "paid" : "tbd"),
    paid_rate_presentation: c.paid_rate_presentation_raw ?? null, compensation_amount_notes: c.compensation_amount_notes ?? null,
    compensation_story_notes: c.compensation_story_notes ?? null, rate_type: project.rate_type ?? "tbd",
    rate_details: project.rate_details ?? {}, is_union: project.is_union ?? false,
    schedule_categories: c.schedule_categories ?? [], start_date: project.start_date, end_date: project.end_date,
    dates_not_confirmed: c.production_dates_not_known_confirmed ?? false, ...project.project_details,
  };
}
export function mergeProjectSettings(project: ProjectRecord, input: ProjectSettingsInput): Record<string, unknown> & { schedule_categories: ProjectSettingsInput["scheduleCategories"] } {
  return { ...projectDetailsFromRecord(project), title: input.title, description: input.description,
    production_company: input.productionCompany, production_company_logo_url: input.productionCompanyLogoUrl || null,
    location: input.location, start_date: input.startDate || null, end_date: input.endDate || null,
    dates_not_confirmed: input.datesNotConfirmed, schedule_categories: input.scheduleCategories };
}
