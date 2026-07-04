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
  if (!heightFilter) return true;
  const h = talent.height ?? "";
  if (heightFilter === "Under 5'6\"") return h.includes("5'3") || h.includes("5'4") || h.includes("5'5");
  if (heightFilter === "5'6\" – 5'9\"") {
    return h.includes("5'6") || h.includes("5'7") || h.includes("5'8") || h.includes("5'9");
  }
  if (heightFilter === "5'10\" and above") {
    return h.includes("5'10") || h.includes("5'11") || h.includes("6'");
  }
  return true;
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
  return talent.filter((item) => {
    if (!matchesKeyword(item, filters.keyword)) return false;
    if (!matchesSubtype(item, filters.subtype)) return false;

    if (filters.location && !(item.location ?? "").toLowerCase().includes(normalize(filters.location))) {
      return false;
    }

    if (filters.representation === "Represented" && !item.represented) return false;
    if (filters.representation === "Independent" && item.represented) return false;

    if (filters.agency && !(item.agency ?? "").toLowerCase().includes(normalize(filters.agency))) {
      return false;
    }

    if (
      filters.style &&
      !item.styles.some((style) => style.toLowerCase().includes(normalize(filters.style)))
    ) {
      return false;
    }

    if (filters.gender && item.gender !== filters.gender) return false;
    if (filters.ethnicity && item.ethnicity !== filters.ethnicity) return false;
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
  { id: "commercial", label: "Commercial Dancers" },
  { id: "hip-hop", label: "Hip Hop Dancers" },
  { id: "contemporary", label: "Contemporary Dancers" },
  { id: "represented", label: "Represented Talent" },
  { id: "available", label: "Available This Month" },
  { id: "los-angeles", label: "Los Angeles" },
  { id: "new-york", label: "New York" },
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const DEFAULT_ROW_SIZE = 16;

function sampleRowTalent(pool: Talent[], size: number): Talent[] {
  if (pool.length === 0 || size <= 0) return [];

  const shuffled = shuffle(pool);
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

function defaultRows(talent: Talent[]): TalentRow[] {
  const pool = uniqueById(talent);
  if (pool.length === 0) return [];

  const rowSize = Math.min(DEFAULT_ROW_SIZE, pool.length);

  return DEFAULT_ROW_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    description: def.description,
    talent: sampleRowTalent(pool, rowSize),
  }));
}

function hasActiveFilters(filters: TalentNavigatorFilters) {
  return Boolean(
    filters.keyword ||
      filters.location ||
      filters.representation ||
      filters.agency ||
      filters.style ||
      filters.subtype ||
      filters.gender ||
      filters.ethnicity ||
      filters.height ||
      filters.availability ||
      filters.unionStatus ||
      filters.experience,
  );
}

export function buildTalentRows(
  talent: Talent[],
  filters: TalentNavigatorFilters,
  options?: { prefiltered?: boolean },
): TalentRow[] {
  const filtered = options?.prefiltered ? talent : filterTalentPool(talent, filters);

  if (filtered.length === 0) return [];

  if (!hasActiveFilters(filters)) {
    return defaultRows(filtered);
  }

  let rows: TalentRow[];

  if (filters.representation === "Represented") {
    const byAgency = groupByField(filtered, (t) => t.agency, "agency");
    rows = byAgency.length ? byAgency : defaultFilteredFallback(filtered);
  } else if (filters.agency) {
    const byStyle = groupByField(filtered, (t) => t.styles[0], "style");
    rows = byStyle.length ? byStyle : defaultFilteredFallback(filtered);
  } else if (filters.style) {
    const byLocation = groupByField(filtered, (t) => t.location?.split(",")[0], "location");
    rows = byLocation.length ? byLocation : defaultFilteredFallback(filtered);
  } else if (filters.location) {
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

  if (filters.location) parts.unshift(`in ${filters.location.split(",")[0]}`);
  if (filters.style) parts.unshift(`${filters.style.toLowerCase()} dancers`);
  if (filters.agency) parts.unshift(`from ${filters.agency}`);
  if (filters.availability) parts.unshift(`${filters.availability.toLowerCase()}`);

  let grouping = "recommendation";
  if (filters.representation === "Represented") grouping = "agency";
  else if (filters.agency || filters.style) grouping = filters.agency ? "style" : "location";
  else if (filters.location) grouping = "style";
  else if (filters.availability) grouping = "style or location";
  else if (rows[0]?.label && !hasActiveFilters(filters)) grouping = "recommendation";

  const descriptor = parts.filter(Boolean).join(" ").replace(/^\w/, (c) => c.toUpperCase());
  return `Showing ${descriptor || "all professional dancers"}, grouped by ${grouping}.`;
}

export function countActiveFilters(filters: TalentNavigatorFilters): number {
  return Object.entries(filters).filter(([, value]) => Boolean(value)).length;
}
