import { cache } from "react";

import { fetchPublicTalentProfile } from "@/lib/publicProfile";
import type { DashboardProfile } from "@/types/database";
import type { PublicTalentProfile } from "@/types/public";

export const fetchOwnPortfolioProfile = cache(
  async (profile: DashboardProfile): Promise<PublicTalentProfile | null> => {
    const slug = profile.username?.trim() || profile.id;
    return fetchPublicTalentProfile(slug);
  },
);
