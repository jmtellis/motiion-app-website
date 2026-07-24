import { profileMatchesHeightFilter } from "@/lib/talent-navigator/height-filter";

import type { Talent, TalentNavigatorFilters, TalentRow } from "./types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function matchesKeyword(talent: Talent, keyword: string) {
  if (!keyword) return true;
  const haystack = [
    talent.name,
    talent.location,
    talent.agency,
    ...talent.styles,
    ...(talent.credits ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalize(keyword));
}

function matchesHeight(talent: Talent, heightFilter: string) {
  return profileMatchesHeightFilter(talent.height, heightFilter);
}

function matchesSubtype(talent: Talent, subtype: string) {
  if (!subtype) return true;
  const want = normalize(subtype);
  const styles = talent.styles.map(normalize);
  if (styles.some((style) => style.includes(want) || want.includes(style))) return true;
  if (want.includes("dancer")) {
    return styles.some((style) => style.includes("dancer"));
  }
  if (want.includes("choreographer")) {
    return styles.some((style) => style.includes("choreographer"));
  }
  return true;
}

export function filterTalentPool(talent: Talent[], filters: TalentNavigatorFilters): Talent[] {
  const genres = filters.genres?.length ? filters.genres : filters.style ? [filters.style] : [];
  const skills = filters.skills ?? [];
  const ethnicities = filters.ethnicities?.length
    ? filters.ethnicities
    : filters.ethnicity
      ? [filters.ethnicity]
      : [];
  const hairColors = filters.hairColors ?? [];
  const eyeColors = filters.eyeColors ?? [];

  return talent.filter((item) => {
    if (!matchesKeyword(item, filters.keyword)) return false;
    if (!matchesSubtype(item, filters.subtype)) return false;

    const locations = filters.locations?.length
      ? filters.locations
      : filters.location
        ? [filters.location]
        : [];
    if (locations.length) {
      const itemLocation = normalize(item.location ?? "");
      if (!itemLocation) return false;
      const matched = locations.some((location) => {
        const wanted = normalize(location);
        return itemLocation.includes(wanted) || wanted.includes(itemLocation);
      });
      if (!matched) return false;
    }

    if (filters.representation === "Represented" && !item.represented) return false;
    if (filters.representation === "Independent" && item.represented) return false;

    const agencies = filters.agencies?.length
      ? filters.agencies
      : filters.agency
        ? [filters.agency]
        : [];
    if (agencies.length) {
      const itemAgency = normalize(item.agency ?? "");
      if (!itemAgency) return false;
      const matched = agencies.some((agency) => {
        const wanted = normalize(agency);
        return itemAgency.includes(wanted) || wanted.includes(itemAgency);
      });
      if (!matched) return false;
    }

    if (genres.length) {
      const haystack = item.styles.map(normalize);
      const matched = genres.some((genre) =>
        haystack.some((style) => style.includes(normalize(genre)) || normalize(genre).includes(style)),
      );
      if (!matched) return false;
    }

    if (skills.length) {
      const haystack = item.styles.map(normalize);
      const matched = skills.some((skill) =>
        haystack.some((style) => style.includes(normalize(skill)) || normalize(skill).includes(style)),
      );
      if (!matched) return false;
    }

    if (filters.gender && item.gender !== filters.gender) return false;

    if (ethnicities.length) {
      const itemEthnicity = normalize(item.ethnicity ?? "");
      if (!itemEthnicity) return false;
      const matched = ethnicities.some((ethnicity) => {
        const wanted = normalize(ethnicity);
        return itemEthnicity.includes(wanted) || wanted.includes(itemEthnicity);
      });
      if (!matched) return false;
    }

    if (hairColors.length) {
      const hair = normalize(item.hairColor ?? "");
      if (!hair || !hairColors.some((color) => hair.includes(normalize(color)))) return false;
    }

    if (eyeColors.length) {
      const eyes = normalize(item.eyeColor ?? "");
      if (!eyes || !eyeColors.some((color) => eyes.includes(normalize(color)))) return false;
    }

    if (filters.height && !matchesHeight(item, filters.height)) return false;
    if (filters.availability && item.availability !== filters.availability) return false;
    if (filters.unionStatus && item.unionStatus !== filters.unionStatus) return false;
    if (filters.experience && item.experience !== filters.experience) return false;

    return true;
  });
}

function uniqueById(items: Talent[]): Talent[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function groupByField(talent: Talent[], field: (t: Talent) => string | undefined, prefix: string): TalentRow[] {
  const groups = new Map<string, Talent[]>();

  for (const item of talent) {
    const key = field(item)?.trim() || "Other";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .filter(([, items]) => items.length >= 2)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, items]) => ({
      id: `${prefix}-${label.toLowerCase().replace(/\s+/g, "-")}`,
      label,
      talent: items,
    }));
}

function dedupeRowsAcrossTalent(rows: TalentRow[]): TalentRow[] {
  const assigned = new Set<string>();
  const result: TalentRow[] = [];

  for (const row of rows) {
    const talent = row.talent.filter((item) => {
      if (assigned.has(item.id)) return false;
      assigned.add(item.id);
      return true;
    });

    if (talent.length > 0) {
      result.push({ ...row, talent });
    }
  }

  return result;
}

const DEFAULT_ROW_DEFS: Array<{ id: string; label: string; description?: string }> = [
  {
    id: "recommended",
    label: "Recommended for You",
    description: "Curated picks based on your activity",
  },
  {
    id: "recently-active",
    label: "Recently Active",
    description: "Talent active on Motiion this week",
  },
  {
    id: "new-to-motiion",
    label: "New to Motiion",
    description: "Fresh profiles joining the platform",
  },
  { id: "commercial", label: "Commercial" },
  { id: "hip-hop", label: "Hip Hop" },
  { id: "contemporary", label: "Contemporary" },
  { id: "represented", label: "Represented" },
  { id: "available", label: "Available This Month" },
  { id: "los-angeles", label: "Los Angeles" },
  { id: "new-york", label: "New York" },
];

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

/** Deterministic shuffle so SSR and client hydration produce the same rows. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let state = seed || 1;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

const DEFAULT_ROW_SIZE = 16;

function sampleRowTalent(
  pool: Talent[],
  size: number,
  rowKey: string,
  shuffleSalt = "",
): Talent[] {
  if (pool.length === 0 || size <= 0) return [];

  const seed = hashSeed(`${shuffleSalt}:${rowKey}:${pool.map((item) => item.id).join(",")}`);
  const shuffled = seededShuffle(pool, seed);
  const result: Talent[] = [];
  const usedInRow = new Set<string>();

  for (let i = 0; i < size; i++) {
    const candidate = shuffled[i % shuffled.length];
    if (!usedInRow.has(candidate.id)) {
      result.push(candidate);
      usedInRow.add(candidate.id);
      continue;
    }

    const alt = shuffled.find((item) => !usedInRow.has(item.id));
    if (!alt) break;
    result.push(alt);
    usedInRow.add(alt.id);
  }

  return result;
}

function defaultRows(talent: Talent[], shuffleSalt = ""): TalentRow[] {
  const pool = uniqueById(talent);
  if (pool.length === 0) return [];

  const rowSize = Math.min(DEFAULT_ROW_SIZE, pool.length);

  return DEFAULT_ROW_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    description: def.description,
    talent: sampleRowTalent(pool, rowSize, def.id, shuffleSalt),
  }));
}

function hasActiveFilters(filters: TalentNavigatorFilters) {
  return Boolean(
    filters.keyword ||
      filters.location ||
      filters.locations?.length ||
      filters.representation ||
      filters.agency ||
      filters.agencies?.length ||
      filters.style ||
      filters.genres?.length ||
      filters.skills?.length ||
      filters.subtype ||
      filters.gender ||
      filters.ethnicity ||
      filters.ethnicities?.length ||
      filters.hairColors?.length ||
      filters.eyeColors?.length ||
      filters.height ||
      filters.availability ||
      filters.unionStatus ||
      filters.experience,
  );
}

export function buildTalentRows(
  talent: Talent[],
  filters: TalentNavigatorFilters,
  options?: { prefiltered?: boolean; shuffleSalt?: string },
): TalentRow[] {
  const filtered = options?.prefiltered ? talent : filterTalentPool(talent, filters);

  if (filtered.length === 0) return [];

  if (!hasActiveFilters(filters)) {
    return defaultRows(filtered, options?.shuffleSalt ?? "");
  }

  let rows: TalentRow[];

  if (filters.representation === "Represented") {
    const byAgency = groupByField(filtered, (t) => t.agency, "agency");
    rows = byAgency.length ? byAgency : defaultFilteredFallback(filtered);
  } else if (filters.agency || filters.agencies?.length) {
    const byStyle = groupByField(filtered, (t) => t.styles[0], "style");
    rows = byStyle.length ? byStyle : defaultFilteredFallback(filtered);
  } else if (filters.style) {
    const byLocation = groupByField(filtered, (t) => t.location?.split(",")[0], "location");
    rows = byLocation.length ? byLocation : defaultFilteredFallback(filtered);
  } else if (filters.location || filters.locations?.length) {
    const byStyle = groupByField(filtered, (t) => t.styles[0], "style");
    rows = byStyle.length ? byStyle : defaultFilteredFallback(filtered);
  } else if (filters.availability) {
    const byStyle = groupByField(filtered, (t) => t.styles[0], "style");
    if (byStyle.length) {
      rows = byStyle;
    } else {
      const byLocation = groupByField(filtered, (t) => t.location?.split(",")[0], "location");
      rows = byLocation.length ? byLocation : defaultFilteredFallback(filtered);
    }
  } else if (filters.gender || filters.ethnicity) {
    const byStyle = groupByField(filtered, (t) => t.styles[0], "style");
    if (byStyle.length >= 2) {
      rows = byStyle;
    } else {
      const availabilityRows = groupByField(filtered, (t) => t.availability, "availability");
      if (availabilityRows.length >= 2) {
        rows = availabilityRows;
      } else {
        const representationRows: TalentRow[] = [
          {
            id: "represented-group",
            label: "Represented",
            talent: filtered.filter((t) => t.represented),
          },
          {
            id: "independent-group",
            label: "Independent",
            talent: filtered.filter((t) => !t.represented),
          },
        ].filter((row) => row.talent.length > 0);

        rows = representationRows.length ? representationRows : defaultFilteredFallback(filtered);
      }
    }
  } else {
    const styleRows = groupByField(filtered, (t) => t.styles[0], "style");
    rows = styleRows.length ? styleRows : defaultFilteredFallback(filtered);
  }

  return dedupeRowsAcrossTalent(rows);
}

function defaultFilteredFallback(filtered: Talent[]): TalentRow[] {
  return [
    {
      id: "filtered-results",
      label: "Results",
      talent: uniqueById(filtered),
    },
  ];
}

export function buildFilterSummary(filters: TalentNavigatorFilters, rows: TalentRow[]): string {
  const parts: string[] = [];

  if (filters.representation === "Represented") {
    parts.push("represented dancers");
  } else if (filters.representation === "Independent") {
    parts.push("independent dancers");
  } else {
    parts.push("professional dancers");
  }

  if (filters.locations?.length) {
    parts.unshift(
      `in ${filters.locations.map((location) => location.split(",")[0]).join(" / ")}`,
    );
  } else if (filters.location) {
    parts.unshift(`in ${filters.location.split(",")[0]}`);
  }
  if (filters.style) parts.unshift(`${filters.style.toLowerCase()} dancers`);
  if (filters.agencies?.length) {
    parts.unshift(`from ${filters.agencies.join(" / ")}`);
  } else if (filters.agency) {
    parts.unshift(`from ${filters.agency}`);
  }
  if (filters.availability) parts.unshift(`${filters.availability.toLowerCase()}`);

  let grouping = "recommendation";
  if (filters.representation === "Represented") grouping = "agency";
  else if (filters.agency || filters.agencies?.length || filters.style) {
    grouping = filters.agency || filters.agencies?.length ? "style" : "location";
  } else if (filters.location || filters.locations?.length) grouping = "style";
  else if (filters.availability) grouping = "style or location";
  else if (rows[0]?.label && !hasActiveFilters(filters)) grouping = "recommendation";

  const descriptor = parts.filter(Boolean).join(" ").replace(/^\w/, (c) => c.toUpperCase());
  return `Showing ${descriptor || "all professional dancers"}, grouped by ${grouping}.`;
}

export function countActiveFilters(filters: TalentNavigatorFilters): number {
  return Object.entries(filters).filter(([, value]) => Boolean(value)).length;
}
