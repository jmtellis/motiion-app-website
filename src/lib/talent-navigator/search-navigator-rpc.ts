import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SearchProfileRecord, SearchResult } from "@/types/search";

import { explicitWorkedWith, normalizeCreditName } from "./credit-intent";
import { searchProfileToTalent } from "./profile-adapter";
import type { Talent, TalentNavigatorInitialData } from "./types";

type NavigatorSignal = {
  category?: string;
  label?: string;
  evidence_type?: string;
  evidence_id?: string;
  verification_status?: string;
  source_type?: string;
  caveat?: string;
};

type NavigatorRpcRow = {
  profile: Record<string, unknown> | null;
  match_signals: NavigatorSignal[] | null;
  rank_score?: number | null;
};

export type CreditNavigatorSearch = {
  result: SearchResult;
  initial: TalentNavigatorInitialData;
};

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => (typeof item === "string" && item.trim() ? [item.trim()] : []));
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function profileRecord(profile: Record<string, unknown>, index: number): SearchProfileRecord {
  const highlights = Array.isArray(profile.profile_highlights)
    ? profile.profile_highlights.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const title = text((item as { title?: unknown }).title);
        if (!title) return [];
        return [{ title, subtitle: text((item as { subtitle?: unknown }).subtitle) }];
      })
    : [];
  const headshots = strings(profile.headshot_urls);
  const headshot = text(profile.headshot_url) ?? headshots[0] ?? null;
  const ethnicity = Array.isArray(profile.ethnicity)
    ? strings(profile.ethnicity).join(", ")
    : text(profile.ethnicity);

  return {
    id: text(profile.id) ?? `credit-${index}`,
    username: text(profile.username),
    full_name: text(profile.full_name),
    display_name: text(profile.full_name),
    headshot_url: headshot,
    headshot_urls: headshot ? [headshot, ...headshots.filter((url) => url !== headshot)] : headshots,
    location: text(profile.location),
    talent_types: strings(profile.talent_types),
    styles: strings(profile.styles),
    skills: strings(profile.skills),
    profile_highlights: highlights,
    representation: text(profile.representation),
    gender: text(profile.gender),
    ethnicity,
    height: text(profile.height),
    union_status: text(profile.union_status),
    eye_color: text(profile.eye_color),
    hair_color: text(profile.hair_color),
  };
}

function withMatchReasons(talent: Talent, signals: NavigatorSignal[] | null | undefined): Talent {
  const reasons = (signals ?? []).flatMap((signal) => {
    const label = text(signal.label);
    if (!label) return [];
    return [{
      category: text(signal.category) ?? "credit",
      label,
      evidenceType: text(signal.evidence_type) ?? "credit",
      evidenceId: text(signal.evidence_id) ?? undefined,
      verificationStatus: text(signal.verification_status) ?? undefined,
      sourceType: text(signal.source_type) ?? undefined,
      caveat: text(signal.caveat) ?? undefined,
    }];
  });
  return reasons.length ? { ...talent, matchReasons: reasons } : talent;
}

function emptyResult(): SearchResult {
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: 0,
    usingFallbackData: false,
    source: "unavailable",
  };
}

/** Dancers whose credits match an artist, choreographer, or project name. */
export async function searchTalentByCredit(creditQuery: string): Promise<CreditNavigatorSearch> {
  const credit = creditQuery.trim();
  const shuffleSalt =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;
  const supabase = await createServerSupabaseClient();
  if (!supabase || !credit) {
    return {
      result: emptyResult(),
      initial: { talent: [], usingFallbackData: false, source: "unavailable", shuffleSalt },
    };
  }

  const { data, error } = await supabase.rpc("search_talent_navigator", {
    p_credit_query: credit,
    p_ranking_profile: "relationship",
    p_limit: 80,
    p_offset: 0,
  });

  if (error || !Array.isArray(data)) {
    return {
      result: emptyResult(),
      initial: { talent: [], usingFallbackData: false, source: "unavailable", shuffleSalt },
    };
  }

  const rows = data as NavigatorRpcRow[];
  const items = rows.map((row, index) => profileRecord(row.profile ?? {}, index));
  const talent = items.map((item, index) =>
    withMatchReasons(searchProfileToTalent(item, index), rows[index]?.match_signals),
  );

  return {
    result: {
      items,
      total: items.length,
      page: 1,
      pageSize: Math.max(items.length, 1),
      usingFallbackData: false,
      source: "talent",
    },
    initial: { talent, usingFallbackData: false, source: "live", shuffleSalt },
  };
}

function ilikePrefix(raw: string): string | null {
  const fragment = normalizeCreditName(raw).replace(/[%_\\,]/g, "");
  return fragment.length >= 2 ? `${fragment}%` : null;
}

/** Credit-catalog names for "Worked with" autocomplete. */
export async function queryCreditCollaborators(query: string): Promise<string[]> {
  const pattern = ilikePrefix(explicitWorkedWith(query) ?? query);
  const supabase = await createServerSupabaseClient();
  if (!pattern || !supabase) return [];

  const [credits, mentions] = await Promise.all([
    supabase
      .from("experience_credit_projection")
      .select("credit_name")
      .ilike("normalized_credit_name", pattern)
      .not("credit_name", "is", null)
      .order("normalized_credit_name", { ascending: true })
      .limit(80),
    supabase
      .from("credit_person_mentions")
      .select("raw_name")
      .ilike("normalized_name", pattern)
      .in("role_kind", ["choreographer", "associate", "assistant"])
      .order("normalized_name", { ascending: true })
      .limit(80),
  ]);

  const displays = [
    ...((credits.data ?? []).map((row) => text(row.credit_name) ?? "")),
    ...((mentions.data ?? []).map((row) => text(row.raw_name) ?? "")),
  ];
  return mergeCollaboratorNames(displays).slice(0, 8);
}

function mergeCollaboratorNames(displays: string[]): string[] {
  const counts = new Map<string, Map<string, number>>();
  for (const display of displays) {
    const trimmed = display.trim();
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 4 || trimmed.length > 60) continue;
    const normalized = normalizeCreditName(trimmed);
    if (normalized.length < 2) continue;
    const spellings = counts.get(normalized) ?? new Map<string, number>();
    spellings.set(trimmed, (spellings.get(trimmed) ?? 0) + 1);
    counts.set(normalized, spellings);
  }

  return [...counts.entries()]
    .map(([, spellings]) => {
      const best = [...spellings.entries()].sort((left, right) => {
        if (left[1] !== right[1]) return right[1] - left[1];
        if (left[0].length !== right[0].length) return left[0].length - right[0].length;
        return left[0].localeCompare(right[0]);
      })[0];
      return best?.[0] ?? "";
    })
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}
