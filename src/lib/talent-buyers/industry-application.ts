import { getBirthDateAge } from "@/lib/onboarding/birth-date";

export type IndustryApplicationStatus = "pending" | "needs_information" | "rejected" | "approved";
export type IndustryApplication = {
  user_id: string;
  full_name: string;
  professional_role: string;
  organization: string;
  contact_email: string;
  work_url: string;
  hiring_projects: string;
  status: IndustryApplicationStatus;
  version: number;
  feedback: string | null;
  submitted_at: string;
};
export type IndustryApplicationDetails = Pick<IndustryApplication,
  "full_name" | "professional_role" | "organization" | "contact_email" | "work_url" | "hiring_projects">;
export function validateIndustryApplication(input: IndustryApplicationDetails): string | null {
  for (const field of [input.full_name, input.professional_role, input.organization]) {
    if (!field.trim() || field.trim().length > 200) return "Add your name, professional role, and company or Independent (up to 200 characters each).";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contact_email.trim()) || input.contact_email.length > 320) return "Enter a valid email. Personal email addresses are welcome.";
  if (input.work_url.trim()) try {
    const url = new URL(normalizeIndustryWorkUrl(input.work_url));
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password || input.work_url.length > 2000 || /\s/.test(input.work_url.trim())) throw new Error();
  } catch { return "Enter a valid website, such as example.com."; }
  if (input.hiring_projects.trim().length < 10 || input.hiring_projects.length > 3000) return "Briefly describe the projects you hire dancers for (10–3000 characters).";
  return null;
}
export const industryApplicationCopy: Record<IndustryApplicationStatus, { title: string; body: string }> = {
  pending: { title: "Application under review", body: "Motiion staff will review your professional work and company affiliation. You can correct your details while you wait." },
  needs_information: { title: "A little more information", body: "Update your application using the feedback below, then submit it for another review." },
  rejected: { title: "Application not approved", body: "Read the feedback below. You can update your details and resubmit the same application." },
  approved: { title: "Industry access approved", body: "You can now continue to your industry workspace." },
};

export function normalizeIndustryWorkUrl(value: string) {
  const trimmed = value.trim();
  return !trimmed || trimmed.includes(":") ? trimmed : `https://${trimmed}`;
}
export type IndustryApplicationIdentity = {
  username: string;
  date_of_birth: string;
  avatar_url: string;
  acquisition_source: string;
  acquisition_source_detail: string;
};
export type IndustryApplicationDraft = IndustryApplicationDetails & IndustryApplicationIdentity;
export const industryApplicationSteps = ["identity", "work", "projects", "acquisition", "review"] as const;
export type IndustryApplicationStep = typeof industryApplicationSteps[number];
export const industryProjectOptions = ["Live performances", "Tours", "Television & film", "Music videos", "Commercials & video ads", "Print campaigns", "Corporate events", "Brand events", "Theater & stage", "Award shows", "Cruise entertainment", "Theme parks", "Classes & workshops", "Social & digital content"];
const sources = ["instagram", "friend_or_referral", "motiion_founder", "event", "other"];
export function validateIndustryApplicationStep(step: IndustryApplicationStep, input: IndustryApplicationDraft, today = new Date()): string | null {
  if (step === "identity" || step === "review") {
    if (!input.full_name.trim() || input.full_name.length > 200) return "Add your name (up to 200 characters).";
    if (!/^[a-z0-9_]{3,30}$/.test(input.username)) return "Choose a username with 3–30 lowercase letters, numbers or underscores.";
    if (input.date_of_birth < "1900-01-01" || getBirthDateAge(input.date_of_birth, today) < 18) return "Enter your date of birth. You must be at least 18.";
    if (!input.avatar_url) return "Add a profile photo to continue.";
  }
  if (step === "work" || step === "review") {
    const validation = validateIndustryApplication({ ...input, hiring_projects: "Project context is checked separately" });
    if (validation) return validation;
  }
  if ((step === "projects" || step === "review") && (input.hiring_projects.trim().length < 10 || input.hiring_projects.length > 3000)) return "Describe the projects you hire for (10–3000 characters).";
  if ((step === "acquisition" || step === "review") && (!sources.includes(input.acquisition_source) || input.acquisition_source_detail.length > 2000)) return "Choose how you heard about Motiion; keep extra details under 2,000 characters.";
  return null;
}
export function parseIndustryApplicationDraft(raw: string | null, userId: string, applicationVersion: number): { details: IndustryApplicationDraft; step: IndustryApplicationStep } | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value.userId !== userId || value.applicationVersion !== applicationVersion || !industryApplicationSteps.includes(value.step)) return null;
    const keys = ["full_name", "professional_role", "organization", "contact_email", "work_url", "hiring_projects", "username", "date_of_birth", "avatar_url", "acquisition_source", "acquisition_source_detail"];
    if (!value.details || keys.some(key => typeof value.details[key] !== "string")) return null;
    return { details: Object.fromEntries(keys.map(key => [key, value.details[key]])) as IndustryApplicationDraft, step: value.step };
  } catch { return null; }
}
