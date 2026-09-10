import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  normalizeFeaturedTalentInviteToken,
  type FeaturedTalentInviteCard,
} from "@/lib/publicFeaturedTalentInvite";

type RpcCard = {
  ok?: boolean;
  error?: string;
  invite_id?: string;
  activity_id?: string;
  parent_id?: string | null;
  display_name?: string;
  event_title?: string;
  cover_image_url?: string | null;
  inviter_name?: string | null;
  token?: string;
  expires_at?: string | null;
};

export async function getFeaturedTalentInviteCard(
  token: string,
): Promise<FeaturedTalentInviteCard | null> {
  const trimmed = normalizeFeaturedTalentInviteToken(token);
  if (!trimmed) return null;

  try {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("get_activity_featured_talent_invite_card", {
      p_token: trimmed,
    });
    if (error) {
      console.error("get_activity_featured_talent_invite_card", error.message);
      return null;
    }
    const row = data as RpcCard | null;
    if (!row?.ok || !row.activity_id || !row.display_name) return null;
    return {
      inviteId: row.invite_id ?? "",
      activityId: row.activity_id,
      parentId: row.parent_id ?? null,
      displayName: row.display_name,
      eventTitle: row.event_title?.trim() || "Event",
      coverImageUrl: row.cover_image_url ?? null,
      inviterName: row.inviter_name ?? null,
      token: row.token ?? trimmed,
      expiresAt: row.expires_at ?? null,
    };
  } catch (err) {
    console.error("getFeaturedTalentInviteCard", err);
    return null;
  }
}
