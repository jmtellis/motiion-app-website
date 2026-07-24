import type { NonTalentSubtype } from "@/types/database";
import type { TalentBuyerRole } from "@/types/talent-buyers";

/** Normalize legacy buyer roles to the v3 onboarding role set. */
export function normalizeBuyerRole(role: string | null | undefined): TalentBuyerRole | "" {
  if (!role) return "";
  switch (role) {
    case "choreographer":
    case "casting_professional":
    case "creative_director_or_producer":
    case "talent_representative":
    case "brand_or_agency_professional":
    case "other":
      return role;
    case "casting_director":
      return "casting_professional";
    case "creative_director":
    case "producer":
      return "creative_director_or_producer";
    case "talent_agency":
      return "talent_representative";
    case "brand":
    case "production_company":
      return "brand_or_agency_professional";
    case "studio_owner":
    case "dance_company":
    case "event_organizer":
      return "other";
    default:
      return "";
  }
}

/** Maps buyer onboarding roles to legacy non_talent_type values when needed. */
export function mapBuyerRoleToLegacyNonTalentType(
  role: TalentBuyerRole,
): NonTalentSubtype | null {
  switch (role) {
    case "casting_professional":
    case "casting_director":
      return "casting_director";
    case "creative_director_or_producer":
    case "creative_director":
      return "creative_director";
    case "producer":
    case "production_company":
      return "producer";
    case "talent_representative":
    case "talent_agency":
      return "agency";
    case "other":
    case "studio_owner":
    case "dance_company":
    case "event_organizer":
      return "other";
    default:
      return null;
  }
}
