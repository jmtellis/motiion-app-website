import { z } from "zod";

/** Public professional links must never contain credentials or executable schemes. */
export function normalizeProfessionalLink(value: string | undefined): string | undefined {
  const text = value?.trim();
  if (!text) return undefined;
  try {
    const url = new URL(text.includes(":") ? text : `https://${text}`);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password || /\s/.test(text) || text.length > 2000) return undefined;
    return url.href;
  } catch { return undefined; }
}
const optionalUrl = z.string().trim().max(2000).optional().refine(value => !value || Boolean(normalizeProfessionalLink(value)), "Enter a valid public website, such as example.com.").transform(value => normalizeProfessionalLink(value));
export const buyerVerificationLinksSchema = z.object({ companyWebsite: optionalUrl, linkedin: optionalUrl, instagram: optionalUrl });
export const buyerProfileEditSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required.").max(200),
  organizationName: z.string().trim().max(200).optional(),
  organizationWebsite: optionalUrl,
  email: z.string().trim().email("Enter a valid work contact email.").max(320).optional(),
  buyerRole: z.enum(["choreographer", "casting_professional", "creative_director_or_producer", "talent_representative", "brand_or_agency_professional", "other", "casting_director", "creative_director", "producer", "talent_agency", "studio_owner", "dance_company", "brand", "production_company", "event_organizer"]).optional().nullable(),
  customRole: z.string().trim().max(200).optional(),
  markets: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
  verificationLinks: buyerVerificationLinksSchema.optional(),
}).refine(input => input.buyerRole !== "other" || Boolean(input.customRole?.trim()), { message: "Describe your professional role.", path: ["customRole"] });

/** Review supplies the first profile name only; an existing completed identity is preserved. */
export function reviewedIndustryIdentity(fullName: string, onboardingCompletedAt: string | null) {
  if (onboardingCompletedAt) return null;
  const displayName = fullName.trim();
  if (!displayName) return null;
  const [firstName, ...lastNames] = displayName.split(/\s+/);
  return { display_name: displayName, first_name: firstName, last_name: lastNames.join(" ") };
}
