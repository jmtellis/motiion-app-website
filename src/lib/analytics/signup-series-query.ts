import { buildSignupSeries, type SignupProfileRow, type SignupSeries } from "@/lib/analytics/signup-series";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type ProfileSignupRecord = {
  created_at: string | null;
  account_type: string | null;
  acquisition_source: string | null;
  acquisition_source_detail: string | null;
};

export async function fetchSignupSeries(sinceIso: string): Promise<{
  series: SignupSeries;
  error: string | null;
}> {
  const empty = buildSignupSeries([], sinceIso);
  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return { series: empty, error: "Supabase admin client is not configured." };
  }

  const rows: SignupProfileRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("profiles")
      .select("created_at, account_type, acquisition_source, acquisition_source_detail")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      return { series: empty, error: error.message };
    }

    const page = (data ?? []) as ProfileSignupRecord[];
    for (const row of page) {
      if (!row.created_at) continue;
      rows.push({
        createdAt: row.created_at,
        accountType: row.account_type,
        acquisitionSource: row.acquisition_source,
        acquisitionSourceDetail: row.acquisition_source_detail,
      });
    }

    if (page.length < pageSize) break;
  }

  return { series: buildSignupSeries(rows, sinceIso), error: null };
}
