import { normalizeIndustryEntityName } from "@/lib/talent-navigator/normalize-entity-name";
import type {
  EntityResolutionResult,
  EntityType,
} from "@/lib/talent-navigator/credit-types";

type EntityRow = {
  id: string;
  entity_type: string;
  canonical_name: string;
  normalized_name: string;
};

type AliasRow = {
  entity_id: string;
  normalized_alias: string;
  industry_entities: EntityRow | EntityRow[] | null;
};

export type EntityLookupClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
      in: (column: string, values: string[]) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
      ilike: (column: string, pattern: string) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
    };
  };
};

function unwrapEntity(value: EntityRow | EntityRow[] | null | undefined): EntityRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0),
  );
  for (let i = 0; i <= a.length; i += 1) matrix[i]![0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0]![j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }
  return matrix[a.length]![b.length]!;
}

function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

const ROLE_ENTITY_TYPES: Record<EntityResolutionResult["role"], EntityType[]> = {
  artist: ["artist"],
  choreographer: ["choreographer", "creative_director"],
  production: [
    "production",
    "tour",
    "music_video",
    "live_performance",
    "commercial",
    "film",
    "television",
    "event",
  ],
};

export async function resolveIndustryEntity(
  client: EntityLookupClient,
  requestedName: string,
  role: EntityResolutionResult["role"],
): Promise<EntityResolutionResult> {
  const normalized = normalizeIndustryEntityName(requestedName);
  if (!normalized) {
    return { requestedName, status: "unresolved", role };
  }

  const allowedTypes = ROLE_ENTITY_TYPES[role];

  const { data: exactEntities } = await client
    .from("industry_entities")
    .select("id, entity_type, canonical_name, normalized_name")
    .eq("normalized_name", normalized);

  const exactMatches = ((exactEntities as EntityRow[] | null) ?? []).filter((row) =>
    allowedTypes.includes(row.entity_type as EntityType),
  );

  if (exactMatches.length === 1) {
    const match = exactMatches[0]!;
    return {
      requestedName,
      status: "resolved",
      role,
      entity: { id: match.id, name: match.canonical_name, type: match.entity_type },
    };
  }
  if (exactMatches.length > 1) {
    return {
      requestedName,
      status: "ambiguous",
      role,
      candidates: exactMatches.map((row) => ({
        id: row.id,
        name: row.canonical_name,
        type: row.entity_type,
        score: 1,
      })),
    };
  }

  const { data: aliasRows } = await client
    .from("industry_entity_aliases")
    .select("entity_id, normalized_alias, industry_entities(id, entity_type, canonical_name, normalized_name)")
    .eq("normalized_alias", normalized);

  const aliasMatches = ((aliasRows as AliasRow[] | null) ?? [])
    .map((row) => unwrapEntity(row.industry_entities))
    .filter((row): row is EntityRow => Boolean(row))
    .filter((row) => allowedTypes.includes(row.entity_type as EntityType));

  const uniqueAlias = new Map(aliasMatches.map((row) => [row.id, row]));
  if (uniqueAlias.size === 1) {
    const match = [...uniqueAlias.values()][0]!;
    return {
      requestedName,
      status: "resolved",
      role,
      entity: { id: match.id, name: match.canonical_name, type: match.entity_type },
    };
  }
  if (uniqueAlias.size > 1) {
    return {
      requestedName,
      status: "ambiguous",
      role,
      candidates: [...uniqueAlias.values()].map((row) => ({
        id: row.id,
        name: row.canonical_name,
        type: row.entity_type,
        score: 0.95,
      })),
    };
  }

  // Safe fuzzy: only accept high similarity (>= 0.88) and prefer single clear winner
  const { data: fuzzyCandidates } = await client
    .from("industry_entities")
    .select("id, entity_type, canonical_name, normalized_name")
    .ilike("normalized_name", `%${normalized.slice(0, Math.min(normalized.length, 12))}%`);

  const scored = ((fuzzyCandidates as EntityRow[] | null) ?? [])
    .filter((row) => allowedTypes.includes(row.entity_type as EntityType))
    .map((row) => ({
      id: row.id,
      name: row.canonical_name,
      type: row.entity_type,
      score: similarityScore(normalized, row.normalized_name),
    }))
    .filter((row) => row.score >= 0.88)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { requestedName, status: "unresolved", role };
  }

  const top = scored[0]!;
  const nearTies = scored.filter((row) => top.score - row.score < 0.03);

  // Never auto-accept weak fuzzy; require very high score and unique winner
  if (nearTies.length === 1 && top.score >= 0.94) {
    return {
      requestedName,
      status: "resolved",
      role,
      entity: { id: top.id, name: top.name, type: top.type },
    };
  }

  if (nearTies.length > 1 || top.score < 0.94) {
    return {
      requestedName,
      status: "ambiguous",
      role,
      candidates: nearTies.slice(0, 5),
    };
  }

  return { requestedName, status: "unresolved", role };
}

export async function resolveEntityNames(
  client: EntityLookupClient,
  input: {
    artists: string[];
    choreographers: string[];
    productions: string[];
  },
): Promise<EntityResolutionResult[]> {
  const results: EntityResolutionResult[] = [];
  for (const name of input.artists) {
    results.push(await resolveIndustryEntity(client, name, "artist"));
  }
  for (const name of input.choreographers) {
    results.push(await resolveIndustryEntity(client, name, "choreographer"));
  }
  for (const name of input.productions) {
    results.push(await resolveIndustryEntity(client, name, "production"));
  }
  return results;
}
