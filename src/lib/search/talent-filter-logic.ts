import { parseHeight } from "@/lib/onboarding/height";
import type { SearchFilters, SearchProfileRecord } from "@/types/search";

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

const GENDER_GROUPS: string[][] = [
  ["male", "man", "m"],
  ["female", "woman", "f"],
  ["non-binary", "nonbinary", "non binary", "enby"],
];

export function genderFilterVariants(gender: string): string[] {
  const normalized = normalizeText(gender);
  if (!normalized) return [];

  const group = GENDER_GROUPS.find((variants) =>
    variants.some((variant) => variant === normalized),
  );
  if (group) return [...new Set([...group, gender.trim()])];

  return [...new Set([gender.trim(), normalized, normalized.toUpperCase(), capitalizeGender(normalized)])];
}

function capitalizeGender(value: string) {
  if (!value) return value;
  return value
    .split(/[\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(value.includes("-") ? "-" : " ");
}

export function matchesGenderFilter(
  profileGender: string | null | undefined,
  filterGender: string | null | undefined,
): boolean {
  const filter = filterGender?.trim() ?? "";
  if (!filter) return true;

  const profile = profileGender?.trim() ?? "";
  if (!profile) return false;

  const filterNorm = normalizeText(filter);
  const profileNorm = normalizeText(profile);
  if (filterNorm === profileNorm) return true;

  const filterGroup = GENDER_GROUPS.find((variants) =>
    variants.some((variant) => variant === filterNorm),
  );
  if (!filterGroup) return filterNorm === profileNorm;

  return filterGroup.some((variant) => variant === profileNorm);
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function normalizeSearchProfile(row: SearchProfileRecord): SearchProfileRecord {
  return {
    ...row,
    display_name: row.display_name ?? row.full_name ?? null,
    talent_types: parseStringArray(row.talent_types),
    styles: parseStringArray(row.styles),
    skills: parseStringArray(row.skills),
    profile_highlights: Array.isArray(row.profile_highlights) ? row.profile_highlights : [],
  };
}

export function heightToTotalInches(value: string | null | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/\u2019/g, "'")
    .replace(/ft/gi, "'")
    .replace(/in/gi, '"');

  const parts = normalized
    .split(/['"\s]+/)
    .map((part) => part.replace(/\D/g, ""))
    .filter(Boolean);

  const feet = Number(parts[0]);
  const inches = Number(parts[1] ?? "0");
  if (!Number.isFinite(feet) || !Number.isFinite(inches) || feet < 3 || feet > 8 || inches < 0 || inches > 11) {
    return null;
  }

  return feet * 12 + inches;
}

export function ethnicityKeys(raw: string): Set<string> {
  const parts = raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const keys = new Set<string>();
  for (const part of parts) {
    keys.add(part);

    if (part.includes("black") || part.includes("african american")) {
      keys.add("black / african american");
      keys.add("african american");
      keys.add("black");
    }
    if (part.includes("white") || part.includes("caucasian")) {
      keys.add("white / caucasian");
      keys.add("caucasian");
      keys.add("white");
    }
    if (part.includes("hispanic") || part.includes("latino") || part.includes("latina")) {
      keys.add("hispanic / latino");
      keys.add("hispanic");
      keys.add("latino");
      keys.add("latina");
    }
    if (part.includes("middle eastern") || part.includes("north african") || part === "mena") {
      keys.add("middle eastern / north african");
      keys.add("middle eastern");
      keys.add("north african");
      keys.add("mena");
    }
    if (part.includes("native american") || part.includes("indigenous")) {
      keys.add("native american / indigenous");
      keys.add("native american");
      keys.add("indigenous");
    }
    if (part.includes("pacific islander")) {
      keys.add("pacific islander");
    }
    if (part.includes("south asian")) {
      keys.add("south asian");
    }
    if (part.includes("asian")) {
      keys.add("asian");
    }
    if (part.includes("multiracial") || part.includes("mixed") || part.includes("biracial")) {
      keys.add("multiracial / mixed");
      keys.add("multiracial");
      keys.add("mixed");
      keys.add("biracial");
    }
  }

  return keys;
}

function normalizedStyleToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ");
}

function profileStyleTokens(profile: SearchProfileRecord): Set<string> {
  const bucket = [
    ...parseStringArray(profile.styles),
    ...parseStringArray(profile.skills),
    ...parseStringArray(profile.talent_types),
  ];
  return new Set(bucket.map(normalizedStyleToken).filter(Boolean));
}

function matchesStylePreference(profile: SearchProfileRecord, style: string) {
  const want = normalizedStyleToken(style);
  if (!want) return true;

  const tokens = profileStyleTokens(profile);
  if (tokens.has(want)) return true;

  for (const token of tokens) {
    if (token.includes(want) || want.includes(token)) return true;
  }

  return false;
}

function matchesHeightBucket(profile: SearchProfileRecord, heightFilter: string) {
  const totalInches = heightToTotalInches(profile.height);
  if (totalInches == null) return false;

  if (heightFilter === "Under 5'6\"") return totalInches <= 65;
  if (heightFilter === "5'6\" – 5'9\"") return totalInches >= 66 && totalInches <= 69;
  if (heightFilter === "5'10\" and above") return totalInches >= 70;

  const parsed = parseHeight(heightFilter);
  return totalInches === parsed.feet * 12 + parsed.inches;
}

function matchesUnionFilter(
  profileUnion: string | null | undefined,
  filterUnion: string | null | undefined,
): boolean {
  const filter = filterUnion?.trim() ?? "";
  if (!filter) return true;

  const profile = profileUnion?.trim() ?? "";
  if (!profile) return false;

  const filterNorm = normalizeText(filter).replace(/\s+/g, " ");
  const profileNorm = normalizeText(profile).replace(/\s+/g, " ");

  if (filterNorm === profileNorm) return true;

  if (filterNorm.includes("non-union") || filterNorm.includes("nonunion")) {
    return profileNorm.includes("non-union") || profileNorm.includes("nonunion");
  }

  if (filterNorm.includes("sag")) {
    return profileNorm.includes("sag");
  }

  return false;
}

function matchesSubtype(profile: SearchProfileRecord, subtype: string) {
  const want = normalizeText(subtype);
  if (!want) return true;

  const types = parseStringArray(profile.talent_types).map(normalizeText);
  if (types.some((type) => type.includes(want) || want.includes(type))) return true;

  if (want === "dancer" || want === "dancers") {
    return types.some((type) => type.includes("dancer"));
  }
  if (want === "choreographer" || want === "choreographers") {
    return types.some((type) => type.includes("choreographer"));
  }

  return false;
}

export function isRepresented(representation?: string | null): boolean {
  const rep = representation?.trim().toLowerCase() ?? "";
  if (!rep) return false;
  return rep !== "independent" && !rep.includes("independent");
}

export function filterSearchProfiles(
  profiles: SearchProfileRecord[],
  filters: SearchFilters,
): SearchProfileRecord[] {
  const keyword = normalizeText(filters.keyword);
  const location = normalizeText(filters.location);
  const style = filters.style?.trim() ?? "";
  const ethnicity = filters.ethnicity?.trim() ?? "";
  const height = filters.height?.trim() ?? "";

  return profiles.filter((profile) => {
    if (keyword) {
      const haystack = [
        profile.full_name,
        profile.display_name,
        profile.location,
        profile.bio,
        profile.representation,
        ...(profile.talent_types ?? []),
        ...(profile.styles ?? []),
        ...(profile.skills ?? []),
        ...(profile.profile_highlights ?? []).flatMap((item) => [item.title, item.subtitle]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(keyword)) return false;
    }

    if (location) {
      const profileLocation = normalizeText(profile.location);
      if (
        profileLocation &&
        !profileLocation.includes(location) &&
        !location.includes(profileLocation)
      ) {
        return false;
      }
    }

    if (style && !matchesStylePreference(profile, style)) return false;

    if (filters.subtype && !matchesSubtype(profile, filters.subtype)) return false;

    if (filters.gender && !matchesGenderFilter(profile.gender, filters.gender)) {
      return false;
    }

    if (filters.unionStatus && !matchesUnionFilter(profile.union_status, filters.unionStatus)) {
      return false;
    }

    if (filters.representation === "Represented" && !isRepresented(profile.representation)) return false;
    if (filters.representation === "Independent" && isRepresented(profile.representation)) return false;

    if (filters.agency) {
      const agency = normalizeText(filters.agency);
      const rep = normalizeText(profile.representation);
      if (!rep.includes(agency)) return false;
    }

    if (ethnicity) {
      const raw = profile.ethnicity?.trim() ?? "";
      if (!raw) return false;
      const wanted = ethnicityKeys(ethnicity);
      const profileKeys = ethnicityKeys(raw);
      const overlap = [...wanted].some((key) => profileKeys.has(key));
      if (!overlap) return false;
    }

    if (height && !matchesHeightBucket(profile, height)) return false;

    return true;
  });
}

type OpportunityAttributes = {
  styles?: string[];
  skills?: string[];
  location?: string | null;
  union_status?: string | null;
};

type TalentMatchInput = {
  styles: string[];
  skills: string[];
  location_city: string | null;
  union_status: string | null;
  availability: string | null;
};

/** Weighted attribute overlap for talent magic moment (PRD Open Q2 default). */
export function scoreOpportunityMatch(talent: TalentMatchInput, opportunity: OpportunityAttributes): number {
  if (talent.availability === "unavailable") return 0;

  let score = 0;
  const talentStyles = new Set(talent.styles.map((s) => s.toLowerCase()));
  const talentSkills = new Set(talent.skills.map((s) => s.toLowerCase()));

  for (const style of opportunity.styles ?? []) {
    if (talentStyles.has(style.toLowerCase())) score += 3;
  }
  for (const skill of opportunity.skills ?? []) {
    if (talentSkills.has(skill.toLowerCase())) score += 2;
  }

  const oppLocation = opportunity.location?.trim().toLowerCase() ?? "";
  const talentLocation = talent.location_city?.trim().toLowerCase() ?? "";
  if (oppLocation && talentLocation && (oppLocation.includes(talentLocation) || talentLocation.includes(oppLocation))) {
    score += 4;
  }

  if (opportunity.union_status && talent.union_status) {
    if (opportunity.union_status.toLowerCase() === talent.union_status.toLowerCase()) score += 2;
  }

  return score;
}
