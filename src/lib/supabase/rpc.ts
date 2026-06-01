import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function supabaseRpc<T>(
  fn: string,
  params?: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { data: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase.rpc(fn, params ?? {});
  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as T, error: null };
}
