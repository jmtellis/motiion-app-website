import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  normalizeFeaturedTalentInviteToken,
  type FeaturedTalentInviteCard,
} from "@/lib/publicFeaturedTalentInvite";

type RpcCard = {
  ok?: boolean;
  workspace_title?: string;
  invitation_role?: "admin" | "participant";
  project_id?: string;
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
    const { data, error } = await supabase.rpc(trimmed.startsWith("ws_") ? "get_workspace_invite_card" : "get_activity_featured_talent_invite_card", {
      p_token: trimmed,
    });
    if (error) {
      console.error("get_activity_featured_talent_invite_card", error.message);
      return null;
    }
    const row = data as RpcCard | null;
    if (!row?.ok || (!row.activity_id && !row.project_id) || !row.display_name) return null;
    let workspaceTitle: string | null = row.workspace_title ?? null;
    if (!workspaceTitle && row.parent_id) {
      const { data: workspace } = await supabase.from("featured_talent_workspaces")
        .select("project_id").eq("featured_talent_id", row.parent_id).is("ended_at", null).maybeSingle();
      if (workspace?.project_id) {
        const { data: project } = await supabase.from("projects").select("title").eq("id", workspace.project_id).maybeSingle();
        workspaceTitle = project?.title ?? null;
      }
    }
    return {
      workspaceTitle,
      invitationRole: row.invitation_role ?? null,
      inviteId: row.invite_id ?? "",
      activityId: row.activity_id ?? "",
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
