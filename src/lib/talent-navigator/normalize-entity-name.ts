/**
 * Normalize industry entity names for stable matching while preserving
 * canonical display names separately.
 */
export function normalizeIndustryEntityName(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[''`´]/g, "")
    .replace(/[""]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function displayCreditSourceLabel(sourceType: string): string {
  switch (sourceType) {
    case "manual":
      return "Manual";
    case "resume":
      return "Resume";
    case "platform_booking":
      return "Motiion booking";
    case "industry_confirmation":
      return "Industry confirmation";
    case "admin_import":
      return "Admin import";
    case "external_source":
      return "External source";
    default:
      return "Other";
  }
}

export function displayVerificationLabel(status: string): string {
  switch (status) {
    case "motiion_verified":
      return "Motiion verified";
    case "industry_confirmed":
      return "Industry confirmed";
    case "document_supported":
      return "Document supported";
    case "talent_reported":
      return "Talent reported";
    case "ai_extracted":
      return "Pending review";
    case "unverified":
      return "Unverified";
    default:
      return status;
  }
}
