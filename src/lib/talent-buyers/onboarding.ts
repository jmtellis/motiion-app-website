import { isAtLeast18 } from "@/lib/auth/age";
import type {
  TalentBuyerCompanySize,
  TalentBuyerOnboardingStep,
  TalentBuyerPrimaryGoal,
  TalentBuyerRole,
  TalentBuyerStyleFocus,
  TalentBuyerTalentType,
} from "@/types/talent-buyers";

export const talentBuyerSteps: TalentBuyerOnboardingStep[] = [
  "dateOfBirth",
  "primaryGoal",
  "role",
  "organization",
  "talentNeeds",
  "styleFocus",
  "markets",
  "verification",
  "notifications",
  "success",
];

export const talentBuyerStepLabels: Record<TalentBuyerOnboardingStep, string> = {
  dateOfBirth: "Date of birth",
  primaryGoal: "Primary goal",
  role: "Role",
  organization: "Organization",
  talentNeeds: "Talent needs",
  styleFocus: "Style focus",
  markets: "Markets",
  verification: "Verification",
  notifications: "Notifications",
  success: "Complete",
};

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

export const roleOptions: Array<{ value: TalentBuyerRole; label: string }> = [
  { value: "casting_director", label: "Casting Director" },
  { value: "choreographer", label: "Choreographer" },
  { value: "creative_director", label: "Creative Director" },
  { value: "producer", label: "Producer" },
  { value: "talent_agency", label: "Talent Agency" },
  { value: "studio_owner", label: "Studio Owner" },
  { value: "dance_company", label: "Dance Company" },
  { value: "brand", label: "Brand" },
  { value: "production_company", label: "Production Company" },
  { value: "event_organizer", label: "Event Organizer" },
  { value: "other", label: "Other" },
];

export const companySizeOptions: Array<{ value: TalentBuyerCompanySize; label: string }> = [
  { value: "just_me", label: "Just Me" },
  { value: "2_10", label: "2–10" },
  { value: "11_50", label: "11–50" },
  { value: "51_200", label: "51–200" },
  { value: "200_plus", label: "200+" },
];

export const talentNeedOptions: Array<{ value: TalentBuyerTalentType; label: string }> = [
  { value: "dancers", label: "Dancers" },
  { value: "choreographers", label: "Choreographers" },
  { value: "dance_teams", label: "Dance Teams" },
  { value: "teachers", label: "Teachers" },
  { value: "creative_talent", label: "Creative Talent" },
];

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

export const suggestedMarkets = [
  "Los Angeles",
  "New York",
  "Atlanta",
  "Nashville",
  "Dallas",
  "London",
];

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
      ? Math.round(((Math.min(index + 1, actionableSteps.length)) / actionableSteps.length) * 100)
      : 0,
  };
}

export function validateTalentBuyerStep(
  step: TalentBuyerOnboardingStep,
  draft: {
    dateOfBirth: string;
    primaryGoal: string;
    role: string;
    organizationName: string;
    companySize: string;
    talentTypes: string[];
    styleFocus: string[];
    markets: string[];
  },
): string | null {
  switch (step) {
    case "dateOfBirth":
      if (!draft.dateOfBirth.trim()) return "Date of birth is required.";
      if (!isAtLeast18(draft.dateOfBirth)) return "You must be at least 18 to join Motiion.";
      return null;
    case "primaryGoal":
      return draft.primaryGoal ? null : "Select your primary goal to continue.";
    case "role":
      return draft.role ? null : "Select the role that best describes you.";
    case "organization":
      if (!draft.organizationName.trim()) return "Organization name is required.";
      if (!draft.companySize) return "Select your company size.";
      return null;
    case "talentNeeds":
      return draft.talentTypes.length ? null : "Select at least one talent type.";
    case "styleFocus":
      return draft.styleFocus.length ? null : "Select at least one style.";
    case "markets":
      return draft.markets.length ? null : "Add at least one market.";
    case "verification":
    case "notifications":
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
  if (role === "casting_director" || primaryGoal === "find_talent") {
    return [
      "Recommended Talent",
      "Recently Active Talent",
      "New to Motiion",
      "Saved Talent",
      "Open Castings",
    ];
  }

  if (role === "talent_agency" || primaryGoal === "manage_talent") {
    return [
      "Talent Database",
      "Agency Shortlists",
      "Recently Updated Profiles",
      "Roster Collections",
    ];
  }

  if (role === "studio_owner" || primaryGoal === "post_opportunities") {
    return [
      "Create Class",
      "Upcoming Classes",
      "Recommended Instructors",
      "Local Talent",
    ];
  }

  if (role === "choreographer") {
    return ["Discover Talent", "Create Session", "Create Job", "Saved Talent"];
  }

  return [
    "Discover Talent",
    "Saved Talent",
    "Open Opportunities",
    "Recent Activity",
  ];
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
}): BuyerRecommendation[] {
  const styleFocus = profile.styleFocus ?? [];
  const markets = profile.markets ?? [];
  const primaryGoal = profile.primaryGoal;

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
