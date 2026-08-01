import { normalizeIndustryEntityName } from "@/lib/talent-navigator/normalize-entity-name";

export type ReferenceProfileCandidate = {
  id: string;
  name: string;
  height: string | null;
  location: string | null;
  styles: string[];
  score: number;
};

export type ReferenceProfileResolution = {
  requestedName: string;
  status: "resolved" | "ambiguous" | "unresolved" | "forbidden";
  profile?: ReferenceProfileCandidate;
  candidates?: ReferenceProfileCandidate[];
  message?: string;
};

type TalentRow = {
  id: string;
  name: string | null;
  height: string | null;
  location: string | null;
  styles: string[] | null;
};

/** Minimal query surface — accept any Supabase-like client via structural typing. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReferenceProfileLookupClient = { from: (table: string) => any };

function scoreNameMatch(requested: string, candidateName: string): number {
  const a = normalizeIndustryEntityName(requested);
  const b = normalizeIndustryEntityName(candidateName);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.startsWith(a) || a.startsWith(b)) return 0.92;
  if (b.includes(a) || a.includes(b)) return 0.85;
  const aParts = a.split(" ");
  const bParts = b.split(" ");
  if (aParts[0] && bParts[0] && aParts[0] === bParts[0]) return 0.78;
  return 0.4;
}

function toCandidate(row: TalentRow, requestedName: string): ReferenceProfileCandidate {
  return {
    id: row.id,
    name: row.name?.trim() || "Unknown",
    height: row.height,
    location: row.location,
    styles: row.styles ?? [],
    score: scoreNameMatch(requestedName, row.name ?? ""),
  };
}

/**
 * Resolve a named Motiion talent profile for opposite/similar/build-around queries.
 * Prefer exact normalized name matches; surface ambiguity instead of guessing.
 */
export async function resolveReferenceProfileByName(
  client: ReferenceProfileLookupClient,
  requestedName: string,
): Promise<ReferenceProfileResolution> {
  const trimmed = requestedName.trim();
  if (!trimmed) {
    return { requestedName, status: "unresolved", message: "No dancer name provided." };
  }

  const pattern = `%${trimmed.replace(/[%_]/g, "")}%`;
  const { data, error } = await client
    .from("talent")
    .select("id, name, height, location, styles")
    .ilike("name", pattern)
    .limit(12);

  if (error) {
    return {
      requestedName: trimmed,
      status: "unresolved",
      message: "Could not look up that dancer right now.",
    };
  }

  const rows = (data as TalentRow[] | null) ?? [];
  if (!rows.length) {
    return {
      requestedName: trimmed,
      status: "unresolved",
      message: `No Motiion profile matched “${trimmed}”.`,
    };
  }

  const candidates = rows
    .map((row) => toCandidate(row, trimmed))
    .sort((a, b) => b.score - a.score);

  const best = candidates[0]!;
  const exact = candidates.filter((c) => c.score >= 0.99);
  if (exact.length === 1) {
    return { requestedName: trimmed, status: "resolved", profile: exact[0] };
  }
  if (exact.length > 1) {
    return {
      requestedName: trimmed,
      status: "ambiguous",
      candidates: exact.slice(0, 6),
      message: `Multiple profiles match “${trimmed}”. Which one?`,
    };
  }

  const strong = candidates.filter((c) => c.score >= 0.85);
  if (strong.length === 1 && best.score >= 0.92) {
    return { requestedName: trimmed, status: "resolved", profile: best };
  }
  if (strong.length > 1 || candidates.length > 1) {
    return {
      requestedName: trimmed,
      status: "ambiguous",
      candidates: (strong.length ? strong : candidates).slice(0, 6),
      message: `Multiple profiles could match “${trimmed}”. Which one?`,
    };
  }

  return { requestedName: trimmed, status: "resolved", profile: best };
}

export async function resolveReferenceProfileById(
  client: ReferenceProfileLookupClient,
  profileId: string,
): Promise<ReferenceProfileResolution> {
  const { data, error } = await client
    .from("talent")
    .select("id, name, height, location, styles")
    .eq("id", profileId)
    .maybeSingle();

  if (error || !data) {
    return {
      requestedName: profileId,
      status: "unresolved",
      message: "That dancer is unavailable for this search.",
    };
  }

  const row = data as TalentRow;
  return {
    requestedName: row.name ?? profileId,
    status: "resolved",
    profile: toCandidate(row, row.name ?? profileId),
  };
}
