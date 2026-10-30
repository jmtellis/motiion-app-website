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
    const url = new URL(input.work_url.trim());
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password || input.work_url.length > 2000) throw new Error();
  } catch { return "Add a public website, portfolio, or credits link beginning with https://."; }
  if (input.hiring_projects.trim().length < 10 || input.hiring_projects.length > 3000) return "Briefly describe the projects you hire dancers for (10–3000 characters).";
  return null;
}
export const industryApplicationCopy: Record<IndustryApplicationStatus, { title: string; body: string }> = {
  pending: { title: "Application under review", body: "Motiion staff will review your professional work and company affiliation. You can correct your details while you wait." },
  needs_information: { title: "A little more information", body: "Update your application using the feedback below, then submit it for another review." },
  rejected: { title: "Application not approved", body: "Read the feedback below. You can update your details and resubmit the same application." },
  approved: { title: "Industry access approved", body: "You can now continue to your industry workspace." },
};
