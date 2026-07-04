import { cache } from "react";

import { jsonbToStringArray } from "@/lib/professional-profile/jsonb-fields";
import { scoreOpportunityMatch } from "@/lib/search/talent-filter-logic";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { MatchedOpportunity } from "@/types/app";

type TalentAttributes = {
  styles: string[];
  skills: string[];
  location_city: string | null;
  union_status: string | null;
  availability: string | null;
};

async function loadTalentAttributes(userId: string): Promise<TalentAttributes | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data: pro } = await supabase
    .from("professional_profiles")
    .select("styles, skills, location_city, union_status, availability")
    .eq("user_id", userId)
    .maybeSingle<TalentAttributes>();

  if (pro) return pro;

  const { data: legacy } = await supabase
    .from("profiles")
    .select("styles, skills, union_status, working_locations")
    .eq("user_id", userId)
    .maybeSingle<{
      styles: unknown;
      skills: unknown;
      union_status: string | null;
      working_locations: unknown;
    }>();

  if (!legacy) return null;

  let location_city: string | null = null;
  if (Array.isArray(legacy.working_locations) && legacy.working_locations[0]) {
    const loc = legacy.working_locations[0];
    location_city = typeof loc === "string" ? loc : typeof loc === "object" && loc && "city" in loc ? String((loc as { city?: string }).city ?? "") : null;
  }

  return {
    styles: jsonbToStringArray(legacy.styles),
    skills: jsonbToStringArray(legacy.skills),
    location_city,
    union_status: legacy.union_status,
    availability: "available",
  };
}

export const fetchMatchedOpportunities = cache(async (userId: string): Promise<MatchedOpportunity[]> => {
  const supabase = await createServerSupabaseClient();
  const talent = await loadTalentAttributes(userId);
  if (!supabase || !talent) return [];

  const [{ data: castings }, { data: activities }] = await Promise.all([
    supabase
      .from("castings")
      .select("id, title, description, status, visibility, configuration, projects ( title, production_company )")
      .eq("status", "open")
      .in("visibility", ["public", "unlisted"])
      .limit(40),
    supabase
      .from("activities")
      .select("id, title, description, type, location, status")
      .eq("status", "active")
      .eq("is_private", false)
      .limit(40),
  ]);

  const scored: MatchedOpportunity[] = [];

  for (const row of castings ?? []) {
    const config = (row.configuration ?? {}) as Record<string, unknown>;
    const styles = Array.isArray(config.styles) ? (config.styles as string[]) : [];
    const skills = Array.isArray(config.special_skills) ? (config.special_skills as string[]) : [];
    const score = scoreOpportunityMatch(talent, {
      styles,
      skills,
      location: typeof config.location_city === "string" ? config.location_city : null,
      union_status: typeof config.union_status === "string" ? config.union_status : null,
    });
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    scored.push({
      id: row.id,
      kind: "casting",
      title: row.title,
      subtitle: project && typeof project === "object" ? String((project as { title?: string }).title ?? "") : "",
      location: typeof config.location_city === "string" ? config.location_city : null,
      score,
      href: `/casting/${row.id}`,
    });
  }

  for (const row of activities ?? []) {
    const score = scoreOpportunityMatch(talent, {
      styles: [],
      skills: [],
      location: row.location,
      union_status: null,
    });
    scored.push({
      id: row.id,
      kind: row.type ?? "activity",
      title: row.title,
      subtitle: row.description?.slice(0, 120) ?? "",
      location: row.location,
      score,
      href: `/activity/${row.id}`,
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, 12);
});
