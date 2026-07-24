import type {
  IndustryPrimaryAction,
  TalentBuyerMarketPlace,
  TalentBuyerOnboardingStep,
  TalentBuyerOrganizationRelationship,
  TalentBuyerPlatformGoal,
  TalentBuyerPrimaryGoal,
  TalentBuyerRole,
  TalentBuyerStyleFocus,
  TalentBuyerTalentType,
  TalentBuyerWorkType,
} from "@/types/talent-buyers";
import { normalizeBuyerRole } from "@/lib/talent-buyers/roles";

export const talentBuyerSteps: TalentBuyerOnboardingStep[] = [
  "professionalContext",
  "goalsAndWork",
  "organizationAndMarket",
  "success",
];

export const talentBuyerStepLabels: Record<TalentBuyerOnboardingStep, string> = {
  professionalContext: "Your role",
  goalsAndWork: "Goals",
  organizationAndMarket: "How you work",
  success: "Complete",
};

export const ACTIVE_HIRING_GOALS: TalentBuyerPlatformGoal[] = [
  "find_dancers",
  "run_a_casting",
  "manage_talent",
  "build_a_roster",
  "staff_a_project",
  "coordinate_bookings",
];

export const platformGoalOptions: Array<{
  value: TalentBuyerPlatformGoal;
  title: string;
  description: string;
}> = [
  {
    value: "find_dancers",
    title: "Find dancers",
    description: "Discover talent for upcoming work.",
  },
  {
    value: "run_a_casting",
    title: "Run a casting",
    description: "Publish roles and collect submissions.",
  },
  {
    value: "manage_talent",
    title: "Manage talent",
    description: "Keep people organized in one place.",
  },
  {
    value: "build_a_roster",
    title: "Build a roster",
    description: "Assemble a working list.",
  },
  {
    value: "staff_a_project",
    title: "Staff a project",
    description: "Fill creative and performance needs.",
  },
  {
    value: "coordinate_bookings",
    title: "Coordinate bookings",
    description: "Track offers and confirmations.",
  },
  {
    value: "just_exploring",
    title: "Just exploring",
    description: "Looking around for now.",
  },
];

export const workTypeOptions: Array<{ value: TalentBuyerWorkType; label: string }> = [
  { value: "music_or_touring", label: "Music or touring" },
  { value: "film_or_television", label: "Film or television" },
  { value: "commercial_or_branded", label: "Commercial or branded content" },
  { value: "live_events", label: "Live events" },
  { value: "classes_or_training", label: "Classes or training" },
  { value: "representation", label: "Representation" },
  { value: "other", label: "Other" },
];

/** Current onboarding role cards (excludes legacy role values retained on TalentBuyerRole). */
export type TalentBuyerOnboardingRole = Extract<
  TalentBuyerRole,
  | "choreographer"
  | "casting_professional"
  | "creative_director_or_producer"
  | "talent_representative"
  | "brand_or_agency_professional"
  | "other"
>;

export const roleOptions: Array<{ value: TalentBuyerOnboardingRole; label: string }> = [
  { value: "choreographer", label: "Choreographer" },
  { value: "casting_professional", label: "Casting professional" },
  { value: "creative_director_or_producer", label: "Creative director or producer" },
  { value: "talent_representative", label: "Talent representative" },
  { value: "brand_or_agency_professional", label: "Brand or agency professional" },
  { value: "other", label: "Other" },
];

/** @deprecated Prefer platformGoalOptions. Kept for recommendation helpers and legacy data. */
export const primaryGoalOptions: Array<{
  value: TalentBuyerPrimaryGoal;
  title: string;
  description: string;
}> = [
  {
    value: "find_talent",
    title: "Find Talent",
    description: "Discover dancers and choreographers.",
  },
  {
    value: "post_opportunities",
    title: "Post Opportunities",
    description: "Castings, classes, sessions, jobs, and events.",
  },
  {
    value: "manage_talent",
    title: "Manage Talent",
    description: "Build rosters and keep track of people.",
  },
  {
    value: "everything",
    title: "A Bit of Everything",
    description: "I wear multiple hats.",
  },
];

/** Kept for recommendation helpers and legacy data; no longer collected in onboarding. */
export const talentNeedOptions: Array<{ value: TalentBuyerTalentType; label: string }> = [
  { value: "dancers", label: "Dancers" },
  { value: "choreographers", label: "Choreographers" },
  { value: "dance_teams", label: "Dance Teams" },
  { value: "teachers", label: "Teachers" },
  { value: "creative_talent", label: "Creative Talent" },
];

/** Kept for recommendation helpers and legacy data; no longer collected in onboarding. */
export const styleFocusOptions: Array<{ value: TalentBuyerStyleFocus; label: string }> = [
  { value: "commercial", label: "Commercial" },
  { value: "hip_hop", label: "Hip Hop" },
  { value: "contemporary", label: "Contemporary" },
  { value: "jazz", label: "Jazz" },
  { value: "ballet", label: "Ballet" },
  { value: "ballroom", label: "Ballroom" },
  { value: "latin", label: "Latin" },
  { value: "tap", label: "Tap" },
  { value: "heels", label: "Heels" },
  { value: "musical_theatre", label: "Musical Theatre" },
  { value: "open_style", label: "Open Style" },
];

/** Suggested chips must resolve through Google Places (city query). */
export const suggestedMarkets = [
  "Los Angeles",
  "New York City",
  "Atlanta",
  "Nashville",
  "Dallas",
  "London",
] as const;

export const defaultBuyerNotificationPreferences = {
  newTalentMatches: true,
  opportunityUpdates: true,
  industryAnnouncements: false,
} as const;

export function marketLabelFromPlace(place: TalentBuyerMarketPlace): string {
  const city = place.city?.trim() || place.displayLabel.trim();
  const region = place.region?.trim();
  if (city && region && !city.includes(region)) {
    return `${city}, ${region}`;
  }
  return city || place.displayLabel;
}

export function marketsFromPlaces(places: TalentBuyerMarketPlace[]): string[] {
  return places.map(marketLabelFromPlace).filter(Boolean);
}

export function getTalentBuyerStepIndex(step: TalentBuyerOnboardingStep) {
  return Math.max(0, talentBuyerSteps.indexOf(step));
}

export function getNextTalentBuyerStep(step: TalentBuyerOnboardingStep): TalentBuyerOnboardingStep {
  const index = getTalentBuyerStepIndex(step);
  return talentBuyerSteps[Math.min(index + 1, talentBuyerSteps.length - 1)];
}

export function getPreviousTalentBuyerStep(step: TalentBuyerOnboardingStep): TalentBuyerOnboardingStep {
  const index = getTalentBuyerStepIndex(step);
  return talentBuyerSteps[Math.max(index - 1, 0)];
}

export function getTalentBuyerFlowProgress(step: TalentBuyerOnboardingStep) {
  const index = getTalentBuyerStepIndex(step);
  const actionableSteps = talentBuyerSteps.filter((item) => item !== "success");

  return {
    sectionTitle: talentBuyerStepLabels[step],
    currentStep: Math.min(index + 1, actionableSteps.length),
    totalSteps: actionableSteps.length,
    percent: actionableSteps.length
      ? Math.round((Math.min(index + 1, actionableSteps.length) / actionableSteps.length) * 100)
      : 0,
  };
}

export function togglePlatformGoal(
  current: TalentBuyerPlatformGoal[],
  value: TalentBuyerPlatformGoal,
): TalentBuyerPlatformGoal[] {
  if (value === "just_exploring") {
    return current.includes("just_exploring") ? [] : ["just_exploring"];
  }

  const withoutExploring = current.filter((goal) => goal !== "just_exploring");
  if (withoutExploring.includes(value)) {
    return withoutExploring.filter((goal) => goal !== value);
  }
  return [...withoutExploring, value];
}

export function shouldShowWorkTypeFollowUp(goals: TalentBuyerPlatformGoal[]): boolean {
  return goals.some((goal) => ACTIVE_HIRING_GOALS.includes(goal));
}

export function toggleWorkType(
  current: TalentBuyerWorkType[],
  value: TalentBuyerWorkType,
): TalentBuyerWorkType[] {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
}

export function deriveLegacyPrimaryGoal(
  goals: TalentBuyerPlatformGoal[],
): TalentBuyerPrimaryGoal {
  if (goals.includes("run_a_casting") || goals.includes("staff_a_project")) {
    return "post_opportunities";
  }
  if (goals.includes("find_dancers")) {
    return "find_talent";
  }
  if (goals.includes("manage_talent") || goals.includes("build_a_roster")) {
    return "manage_talent";
  }
  if (goals.includes("coordinate_bookings")) {
    return "post_opportunities";
  }
  return "everything";
}

export function mapLegacyPrimaryGoalToPlatformGoals(
  primaryGoal: TalentBuyerPrimaryGoal | "" | null | undefined,
): TalentBuyerPlatformGoal[] {
  switch (primaryGoal) {
    case "find_talent":
      return ["find_dancers"];
    case "post_opportunities":
      return ["run_a_casting"];
    case "manage_talent":
      return ["manage_talent"];
    case "everything":
      return ["just_exploring"];
    default:
      return [];
  }
}

export function roleLabel(role: TalentBuyerRole | "" | null | undefined, customRole?: string | null) {
  const normalized = normalizeBuyerRole(role);
  if (normalized === "other" && customRole?.trim()) {
    return customRole.trim();
  }
  const fromOptions = roleOptions.find((option) => option.value === normalized)?.label;
  if (fromOptions) return fromOptions;
  return normalized || null;
}

export function workTypeLabel(
  workTypes: TalentBuyerWorkType[] | null | undefined,
  customWorkType?: string | null,
): string | null {
  if (!workTypes?.length) return null;
  const primary = workTypes[0]!;
  if (primary === "other" && customWorkType?.trim()) {
    return customWorkType.trim();
  }
  return workTypeOptions.find((option) => option.value === primary)?.label ?? primary;
}

export function buildOnboardingSummary(parts: {
  role: TalentBuyerRole | "";
  customRole?: string;
  workTypes: TalentBuyerWorkType[];
  customWorkType?: string;
  marketPlaces: TalentBuyerMarketPlace[];
  markets?: string[];
}): string {
  const segments = [
    roleLabel(parts.role, parts.customRole),
    workTypeLabel(parts.workTypes, parts.customWorkType),
    parts.marketPlaces[0]
      ? marketLabelFromPlace(parts.marketPlaces[0])
      : parts.markets?.[0] ?? null,
  ].filter(Boolean);
  return segments.join(" · ");
}

export function resolveIndustryPrimaryAction(
  goals: TalentBuyerPlatformGoal[],
): IndustryPrimaryAction {
  if (goals.includes("run_a_casting")) {
    return { id: "create_casting", label: "Create a casting", href: "/projects?create=1" };
  }
  if (goals.includes("staff_a_project")) {
    return { id: "create_project", label: "Create a project", href: "/projects?create=1" };
  }
  if (goals.includes("find_dancers")) {
    return { id: "find_dancers", label: "Find dancers", href: "/talent" };
  }
  if (goals.includes("build_a_roster") || goals.includes("manage_talent")) {
    return { id: "start_roster", label: "Start a roster", href: "/library" };
  }
  if (goals.includes("coordinate_bookings")) {
    return {
      id: "coordinate_bookings",
      label: "Open projects",
      href: "/projects",
    };
  }
  return { id: "explore", label: "Explore Motiion", href: "/projects" };
}

export function resolveIndustrySecondaryAction(
  primary: IndustryPrimaryAction,
): IndustryPrimaryAction | null {
  if (primary.id === "explore") return null;
  if (primary.id === "find_dancers") {
    return { id: "explore", label: "Go to workspace", href: "/projects" };
  }
  return { id: "find_dancers", label: "Find dancers", href: "/talent" };
}

export function validateTalentBuyerStep(
  step: TalentBuyerOnboardingStep,
  draft: {
    fullName: string;
    contactEmail: string;
    role: string;
    customRole: string;
    platformGoals: TalentBuyerPlatformGoal[];
    workTypes: TalentBuyerWorkType[];
    customWorkType: string;
    organizationRelationship: TalentBuyerOrganizationRelationship | "";
    organizationName: string;
    organizationWebsite: string;
    markets: string[];
    marketPlaces: TalentBuyerMarketPlace[];
  },
): string | null {
  switch (step) {
    case "professionalContext": {
      if (!draft.fullName.trim()) return "Confirm your name to continue.";
      if (!draft.contactEmail.trim()) return "Work email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail.trim())) {
        return "Enter a valid work email.";
      }
      if (!draft.role) return "Select the role that best describes you.";
      if (draft.role === "other" && !draft.customRole.trim()) {
        return "Tell us your role.";
      }
      return null;
    }
    case "goalsAndWork": {
      if (!draft.platformGoals.length) return "Select at least one goal to continue.";
      return null;
    }
    case "organizationAndMarket": {
      if (!draft.organizationRelationship) {
        return "Choose how you’re connected to an organization.";
      }
      if (
        draft.organizationRelationship === "organization" ||
        draft.organizationRelationship === "multiple"
      ) {
        if (!draft.organizationName.trim()) {
          return "Select or enter your organization.";
        }
      }
      if (draft.workTypes.includes("other") && !draft.customWorkType.trim()) {
        return "Tell us what kind of work you’re hiring for.";
      }
      if (!draft.marketPlaces.length && !draft.markets.length) {
        return "Add your primary market.";
      }
      return null;
    }
    case "success":
      return null;
    default:
      return null;
  }
}

export function getTalentBuyerDashboardSections(
  role: TalentBuyerRole | "" | null | undefined,
  primaryGoal: TalentBuyerPrimaryGoal | "" | null | undefined,
) {
  const normalized = normalizeBuyerRole(role);

  if (normalized === "casting_professional" || primaryGoal === "find_talent") {
    return [
      "Recommended Talent",
      "Recently Active Talent",
      "New to Motiion",
      "Saved Talent",
      "Open Castings",
    ];
  }

  if (normalized === "talent_representative" || primaryGoal === "manage_talent") {
    return [
      "Talent Database",
      "Agency Shortlists",
      "Recently Updated Profiles",
      "Roster Collections",
    ];
  }

  if (primaryGoal === "post_opportunities") {
    return [
      "Create Class",
      "Upcoming Classes",
      "Recommended Instructors",
      "Local Talent",
    ];
  }

  if (normalized === "choreographer") {
    return ["Discover Talent", "Create Session", "Create Job", "Saved Talent"];
  }

  return ["Discover Talent", "Saved Talent", "Open Opportunities", "Recent Activity"];
}

export type BuyerRecommendation = {
  id: string;
  title: string;
  description: string;
  href: string;
};

export function buildBuyerRecommendations(profile: {
  styleFocus?: TalentBuyerStyleFocus[] | null;
  markets?: string[] | null;
  primaryGoal?: TalentBuyerPrimaryGoal | null;
  platformGoals?: TalentBuyerPlatformGoal[] | null;
}): BuyerRecommendation[] {
  const styleFocus = profile.styleFocus ?? [];
  const markets = profile.markets ?? [];
  const primaryGoal =
    profile.primaryGoal ??
    (profile.platformGoals?.length ? deriveLegacyPrimaryGoal(profile.platformGoals) : null);

  const items: BuyerRecommendation[] = [];

  if (styleFocus.length) {
    const style = styleFocus[0]!;
    items.push({
      id: "style-search",
      title: `Browse ${style.replace(/_/g, " ")} talent`,
      description: "Jump into Talent Navigator with your style focus pre-filtered.",
      href: `/talent?style=${encodeURIComponent(style)}`,
    });
  }

  if (markets.length) {
    items.push({
      id: "market-search",
      title: `Talent in ${markets[0]}`,
      description: "Search performers in one of your primary markets.",
      href: `/talent?location=${encodeURIComponent(markets[0]!)}`,
    });
  }

  if (primaryGoal === "post_opportunities" || primaryGoal === "everything") {
    items.push({
      id: "create-casting",
      title: "Create a new casting",
      description: "Publish roles and start collecting submissions.",
      href: "/projects?create=1",
    });
  }

  if (primaryGoal === "manage_talent" || primaryGoal === "find_talent") {
    items.push({
      id: "library",
      title: "Organize your rosters",
      description: "Group saved talent for projects and client reviews.",
      href: "/library",
    });
  }

  items.push({
    id: "navigator",
    title: "Explore Talent Navigator",
    description: "Keyboard-first search across the Motiion database.",
    href: "/talent",
  });

  return items.slice(0, 4);
}
