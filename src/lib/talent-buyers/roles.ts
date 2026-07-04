import type { NonTalentSubtype } from "@/types/database";
import type { TalentBuyerRole } from "@/types/talent-buyers";

/** Maps buyer onboarding roles to legacy non_talent_type values when needed. */
export function mapBuyerRoleToLegacyNonTalentType(
  role: TalentBuyerRole,
): NonTalentSubtype | null {
  switch (role) {
    case "casting_director":
      return "casting_director";
    case "creative_director":
      return "creative_director";
    case "producer":
    case "production_company":
      return "producer";
    case "talent_agency":
      return "agency";
    case "other":
      return "other";
    default:
      return null;
  }
}
