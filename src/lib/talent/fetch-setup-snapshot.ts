import { cache } from "react";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  DeferredSetupSkipped,
  ProfileReviewStatus,
  TalentSetupProfile,
} from "@/lib/talent/profile-setup";

export type TalentSetupSnapshot = {
  profile: TalentSetupProfile;
  reviewStatus: ProfileReviewStatus;
  highlightsCount: number;
  socialCount: number;
  username: string | null;
};

type ProfileRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  username: string | null;
  talent_types: string[] | null;
  headshot_urls: string[] | null;
  headshot_original_urls: string[] | null;
  resume_url: string | null;
  gender: string | null;
  ethnicity: string | null;
  height: string | null;
  hair_color: string | null;
  eye_color: string | null;
  sizing: string | null;
  working_locations: string[] | null;
  representation: string | null;
  agent: string | null;
  union_status: string | null;
  styles: string[] | null;
  skills: string[] | null;
  experiences: unknown[] | null;
  profile_highlights: unknown[] | null;
  profile_setup_completed_at: string | null;
  deferred_setup_skipped: DeferredSetupSkipped | null;
  profile_review_status: string | null;
  instagram_url: string | null;
  x_url: string | null;
  tiktok_url: string | null;
  whatsapp_url: string | null;
  youtube_url: string | null;
};

function countSocials(row: ProfileRow) {
  return [row.instagram_url, row.x_url, row.tiktok_url, row.whatsapp_url, row.youtube_url].filter(
    (value) => Boolean(value?.trim()),
  ).length;
}

function normalizeReviewStatus(value: string | null | undefined): ProfileReviewStatus {
  if (value === "pending" || value === "approved" || value === "declined") return value;
  return "not_submitted";
}

export const fetchTalentSetupSnapshot = cache(
  async (userId: string): Promise<TalentSetupSnapshot | null> => {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return null;

    const { data } = await supabase
      .from("profiles")
      .select(
        "user_id, first_name, last_name, display_name, username, talent_types, headshot_urls, headshot_original_urls, resume_url, gender, ethnicity, height, hair_color, eye_color, sizing, working_locations, representation, agent, union_status, styles, skills, experiences, profile_highlights, profile_setup_completed_at, deferred_setup_skipped, profile_review_status, instagram_url, x_url, tiktok_url, whatsapp_url, youtube_url",
      )
      .eq("user_id", userId)
      .maybeSingle<ProfileRow>();

    if (!data) return null;

    let reviewStatus = normalizeReviewStatus(data.profile_review_status);
    try {
      const { data: rpcStatus } = await supabase.rpc("get_my_profile_review_status");
      if (rpcStatus && typeof rpcStatus === "object" && "status" in rpcStatus) {
        reviewStatus = normalizeReviewStatus(String((rpcStatus as { status: string }).status));
      }
    } catch {
      // Column fallback is enough when RPC is unavailable.
    }

    return {
      profile: {
        userId: data.user_id,
        firstName: data.first_name,
        lastName: data.last_name,
        displayName: data.display_name,
        talentTypes: data.talent_types,
        headshotUrls: data.headshot_urls,
        headshotOriginalUrls: data.headshot_original_urls,
        resumeUrl: data.resume_url,
        gender: data.gender,
        ethnicity: data.ethnicity,
        height: data.height,
        hairColor: data.hair_color,
        eyeColor: data.eye_color,
        sizing: data.sizing,
        workingLocations: data.working_locations,
        representation: data.representation,
        agent: data.agent,
        unionStatus: data.union_status,
        styles: data.styles,
        skills: data.skills,
        experiences: Array.isArray(data.experiences) ? data.experiences : [],
        profileSetupCompletedAt: data.profile_setup_completed_at,
        deferredSetupSkipped: data.deferred_setup_skipped ?? {},
      },
      reviewStatus,
      highlightsCount: Array.isArray(data.profile_highlights) ? data.profile_highlights.length : 0,
      socialCount: countSocials(data),
      username: data.username,
    };
  },
);
