import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type ProductionJobJoinCard = {
  jobId: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  coverImageUrl: string | null;
  choreographerName: string | null;
  inviterName: string | null;
  posterId: string | null;
  token: string;
};

type RpcCard = {
  ok?: boolean;
  error?: string;
  job_id?: string;
  title?: string;
  start_date?: string | null;
  end_date?: string | null;
  cover_image_url?: string | null;
  choreographer_name?: string | null;
  inviter_name?: string | null;
  poster_id?: string | null;
  token?: string;
};

export async function getProductionJobJoinCard(
  token: string,
): Promise<ProductionJobJoinCard | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  try {
    const supabase = createAdminSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("get_production_job_join_card", {
      p_token: trimmed,
    });
    if (error) {
      console.error("get_production_job_join_card", error.message);
      return null;
    }
    const row = data as RpcCard | null;
    if (!row?.ok || !row.job_id || !row.title) return null;
    return {
      jobId: row.job_id,
      title: row.title,
      startDate: row.start_date ?? null,
      endDate: row.end_date ?? null,
      coverImageUrl: row.cover_image_url ?? null,
      choreographerName: row.choreographer_name ?? null,
      inviterName: row.inviter_name ?? null,
      posterId: row.poster_id ?? null,
      token: row.token ?? trimmed,
    };
  } catch (err) {
    console.error("getProductionJobJoinCard", err);
    return null;
  }
}
