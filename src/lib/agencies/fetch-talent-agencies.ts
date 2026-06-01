import { createServerSupabaseClient } from "@/lib/supabase/server";

export type TalentAgency = {
  id: string;
  name: string;
  location: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

const FALLBACK_AGENCIES: TalentAgency[] = [
  { id: "caa", name: "CAA", location: "Los Angeles, CA", logo_url: null, contact_email: null, contact_phone: null },
  { id: "wme", name: "WME", location: "Beverly Hills, CA", logo_url: null, contact_email: null, contact_phone: null },
  { id: "uta", name: "UTA", location: "Beverly Hills, CA", logo_url: null, contact_email: null, contact_phone: null },
  { id: "other", name: "Other", location: null, logo_url: null, contact_email: null, contact_phone: null },
];

export async function fetchTalentAgencies(): Promise<TalentAgency[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return FALLBACK_AGENCIES;

  const { data, error } = await supabase
    .from("talent_agencies")
    .select("id,name,location,logo_url,contact_email,contact_phone")
    .order("name", { ascending: true })
    .limit(200);

  if (error || !data?.length) {
    return FALLBACK_AGENCIES;
  }

  const agencies = data as TalentAgency[];
  const hasOther = agencies.some((agency) => agency.name.toLowerCase() === "other");

  return hasOther ? agencies : [...agencies, FALLBACK_AGENCIES[FALLBACK_AGENCIES.length - 1]];
}
