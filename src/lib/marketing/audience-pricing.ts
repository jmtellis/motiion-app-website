export type PricingPlan = {
  name: string;
  price: string;
  period?: string;
  description: string;
  cta: { label: string; href: string };
  features: string[];
  highlighted?: boolean;
};

export type TalentPricingRole = "dancer" | "choreographer";

export type TalentRolePricing = {
  role: TalentPricingRole;
  label: string;
  free: PricingPlan;
  pro: PricingPlan;
};

export type TalentPricingContent = {
  variant: "talent";
  title: string;
  description: string;
  roles: TalentRolePricing[];
};

export type IndustryPricingContent = {
  variant: "industry";
  title: string;
  description: string;
  free: PricingPlan;
  pro: PricingPlan;
};

export type AudiencePricingContent = TalentPricingContent | IndustryPricingContent;

export const talentPricingContent: TalentPricingContent = {
  variant: "talent",
  title: "Pricing",
  description: "Start free, then go Pro when you need more submissions, media, and visibility.",
  roles: [
    {
      role: "dancer",
      label: "Dancer",
      free: {
        name: "Free",
        price: "$0",
        period: "forever",
        description: "Build your profile and start responding to open castings.",
        cta: { label: "Sign up free", href: "/signup" },
        features: [
          "Up to 4 headshots",
          "Reel and slate videos only",
          "Highlight up to 2 portfolio credits",
          "Favorites and following lists",
          "5 casting submissions total",
          "Browse open castings — profile matches unlock with Pro",
        ],
      },
      pro: {
        name: "Pro",
        price: "$19.99",
        period: "per month",
        description: "Unlimited submissions, richer media, and profile-matched opportunities.",
        cta: { label: "Start Pro", href: "/signup?plan=pro&role=dancer" },
        highlighted: true,
        features: [
          "Unlimited casting submissions",
          "Profile-matched opportunities",
          "Up to 10 headshots",
          "Skills, genre, reel, slate, and bonus reels",
          "Highlight up to 10 portfolio credits",
          "Up to 3 visuals per résumé experience",
          "Unlimited custom and shared rosters",
        ],
      },
    },
    {
      role: "choreographer",
      label: "Choreographer",
      free: {
        name: "Free",
        price: "$0",
        period: "forever",
        description: "Present your work and publish your first castings.",
        cta: { label: "Sign up free", href: "/signup" },
        features: [
          "Up to 4 headshots",
          "Reel and slate videos only",
          "Highlight up to 2 portfolio credits",
          "Favorites and following lists",
          "5 casting submissions total",
          "Publish up to 2 castings — profile matches unlock with Pro",
        ],
      },
      pro: {
        name: "Pro",
        price: "$49.99",
        period: "per month",
        description: "Unlimited castings, submissions, and a fuller creative portfolio.",
        cta: { label: "Start Pro", href: "/signup?plan=pro&role=choreographer" },
        highlighted: true,
        features: [
          "Unlimited castings",
          "Unlimited casting submissions",
          "Profile-matched opportunities",
          "Up to 10 headshots",
          "All visual skill and genre categories",
          "Highlight up to 10 portfolio credits",
          "Up to 3 visuals per résumé experience",
          "Unlimited custom and shared rosters",
        ],
      },
    },
  ],
};

export const industryPricingContent: IndustryPricingContent = {
  variant: "industry",
  title: "Pricing",
  description: "Start free, then go Pro to unlock search, rosters, and projects.",
  free: {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Explore the platform and browse public profiles. Upgrade to Pro for search, rosters, and projects.",
    cta: { label: "Create free account", href: "/talent-buyers/signup" },
    features: [
      "Create your industry account",
      "Browse public talent profiles",
      "Dashboard and account settings",
    ],
  },
  pro: {
    name: "Pro",
    price: "$200",
    period: "per month",
    description: "Full discovery, roster, and project workflow for hiring teams.",
    cta: { label: "Start Pro", href: "/talent-buyers/signup?plan=pro" },
    highlighted: true,
    features: [
      "Unlimited talent search and filters",
      "Saved searches",
      "Unlimited rosters and talent library",
      "Unlimited projects and castings",
      "Invite talent and track submissions",
      "Manage billing from your account",
    ],
  },
};
