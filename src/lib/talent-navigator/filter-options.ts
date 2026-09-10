/**
 * Filter option catalogs aligned with iOS (`ProfileEnums`, `TalentFilterSheet`, `DanceStylePreset`).
 * These are canonical attribute values — not per-user. Agencies are loaded from the database separately.
 */

export const PROFILE_TYPE_OPTIONS = ["Dancer", "Choreographer", "Instructor"] as const;

export const GENDER_OPTIONS = ["Male", "Female", "Non-binary"] as const;

export const ETHNICITY_OPTIONS = [
  "Black / African American",
  "White / Caucasian",
  "Hispanic / Latino",
  "Asian",
  "Middle Eastern / North African",
  "Native American / Indigenous",
  "Pacific Islander",
  "South Asian",
  "Multiracial / Mixed",
  "Other",
] as const;

export const HAIR_COLOR_OPTIONS = ["Black", "Blonde", "Brown", "Red", "Other"] as const;

export const EYE_COLOR_OPTIONS = ["Amber", "Blue", "Brown", "Green", "Gray", "Mixed"] as const;

export const UNION_STATUS_OPTIONS = ["SAG-AFTRA", "SAG-AFTRA Eligible", "Non-union"] as const;

export const REPRESENTATION_OPTIONS = ["Represented", "Independent"] as const;

/** Matches `CastingConfiguration.danceStyleTitlesOrdered` on iOS. */
export const GENRE_OPTIONS = [
  "Hip Hop",
  "Heels",
  "Contemporary",
  "Jazz Funk",
  "Jazz",
  "Ballet",
  "Tap",
  "Ballroom",
  "Latin",
  "Afrobeat",
  "House",
  "Popping",
  "Locking",
  "Breaking",
  "Freestyle",
  "Partnering",
  "Tricks / Tumbling",
  "Acting",
  "Singing",
  "Other",
] as const;

/** Matches iOS `OnboardingExperienceOptions.danceStyles` (TalentFilterSheet genres). */
export const ROLE_GENRE_OPTIONS = [
  "Ballet",
  "Pointe",
  "Contemporary",
  "Modern",
  "Jazz",
  "Tap",
  "Hip-Hop",
  "Commercial",
  "Street Jazz",
  "Heels",
  "Lyrical",
  "Musical Theatre",
  "Ballroom",
  "Latin",
  "Salsa",
  "Bachata",
  "Kizomba",
  "Swing",
  "Lindy Hop",
  "Breaking",
  "Popping",
  "Locking",
  "House",
  "Waacking",
  "Voguing",
  "Afro",
  "Afrobeats",
  "Dancehall",
  "Reggaeton",
  "Krump",
  "Step",
  "Cheer Dance",
  "Pom",
  "Acro",
  "Aerial",
  "Partnering",
  "Improvisation",
  "Cultural / Folk",
] as const;

/** Matches iOS `OnboardingExperienceOptions.skills` (TalentFilterSheet skills). */
export const ROLE_SKILL_OPTIONS = [
  "Choreography",
  "Freestyle",
  "Improvisation",
  "Partnering",
  "Lifts",
  "Tumbling",
  "Acro Tricks",
  "Turns",
  "Leaps",
  "Floor Work",
  "Aerial Silks",
  "Lyra / Hoop",
  "Pole",
  "Stunts",
  "Stage Combat",
  "Acting",
  "Camera Acting",
  "Voiceover",
  "Singing",
  "Rapping",
  "Harmony Singing",
  "Piano",
  "Guitar",
  "Drums",
  "Violin",
  "DJing",
  "Skating",
  "Roller Skating",
  "Inline Skating",
  "Ice Skating",
  "BMX",
  "Scooter",
  "Parkour",
  "Martial Arts",
  "Gymnastics",
  "Yoga",
  "Pilates",
  "Modeling",
  "Runway",
  "Hosting",
  "Dialect / Accent Work",
  "Spanish",
  "French",
  "ASL",
] as const;

/** Simplified height buckets until we add iOS-style range picker on web. */
export const HEIGHT_OPTIONS = ["Under 5'6\"", "5'6\" – 5'9\"", "5'10\" and above"] as const;

export const FALLBACK_AGENCY_OPTIONS = [
  "Bloc LA",
  "Movement House",
  "Clear Talent Group",
  "MSA",
  "CAA",
  "WME",
  "UTA",
  "Independent",
] as const;

export type NavigatorAgencyOption = {
  name: string;
  logoUrl: string | null;
};

export type NavigatorFilterOptions = {
  agencies: NavigatorAgencyOption[];
  locations: string[];
};

export const DEFAULT_NAVIGATOR_FILTER_OPTIONS: NavigatorFilterOptions = {
  agencies: FALLBACK_AGENCY_OPTIONS.map((name) => ({ name, logoUrl: null })),
  locations: [
    "Los Angeles, CA",
    "New York, NY",
    "Atlanta, GA",
    "Chicago, IL",
    "Miami, FL",
  ],
};

export const HAIR_COLOR_SWATCHES: Record<(typeof HAIR_COLOR_OPTIONS)[number], string> = {
  Black: "#1c1c1c",
  Blonde: "#e0c36a",
  Brown: "#6b3f24",
  Red: "#a33a28",
  Other: "conic-gradient(from 180deg, #1c1c1c, #e0c36a, #6b3f24, #a33a28, #1c1c1c)",
};

export const EYE_COLOR_SWATCHES: Record<(typeof EYE_COLOR_OPTIONS)[number], string> = {
  Amber: "#c48a3a",
  Blue: "#4a7ec7",
  Brown: "#5c3a1e",
  Green: "#3f8f5b",
  Gray: "#8a9098",
  Mixed: "conic-gradient(from 90deg, #4a7ec7, #5c3a1e, #3f8f5b, #c48a3a, #4a7ec7)",
};
