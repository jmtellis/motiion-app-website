import { createServerSupabaseClient } from "@/lib/supabase/server";

export type TalentAgency = {
  id: string;
  name: string;
  location: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

export async function fetchTalentAgencies(): Promise<TalentAgency[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("talent_agencies")
    .select("id,name,location,logo_url,contact_email,contact_phone")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(200);

  if (error || !data?.length) {
    return [];
  }

  return data as TalentAgency[];
}
