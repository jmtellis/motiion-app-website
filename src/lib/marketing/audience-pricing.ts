import { getIosAppStoreUrl } from "@/lib/referrals/app-store";

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

// USD display prices and feature bullets mirror the iOS paywall configuration.
export const talentPricingContent: IndustryPricingContent = {
  "variant": "industry",
  "title": "Talent plans",
  "description": "Start free. Upgrade when you need more.",
  "free": {
    "name": "Free",
    "price": "$0",
    "period": "forever",
    "description": "Explore Motiion with the essentials.",
    "cta": {
      "label": "Sign up free",
      "href": "/signup?account_type=talent"
    },
    "features": [
      "Up to 4 headshots",
      "Reel & slate videos only",
      "Highlight up to 2 portfolio credits",
      "Favorites & Notify me included; create & share custom lists with Pro",
      "5 casting submissions total",
      "Browse open castings — profile matches unlock with Talent Pro"
    ]
  },
  "pro": {
    "name": "Talent Pro",
    "price": "$29.99",
    "period": "USD / month",
    "description": "More opportunities, visibility, and room to showcase your work.",
    "cta": {
      "label": "Get Talent Pro in the app",
      "href": getIosAppStoreUrl()
    },
    "features": [
      "Unlimited casting submissions",
      "Profile-matched opportunities",
      "Priority listing in casting searches",
      "Up to 10 headshots",
      "Skills, genre, reel, slate & bonus reels",
      "Highlight up to 10 portfolio credits",
      "Up to 3 visuals per resume experience",
      "Motiion resume PDF export"
    ],
    "highlighted": true
  }
};

export const industryPricingContent: IndustryPricingContent = {
  variant: "industry",
  title: "Casting and project plans",
  description: "Choose a Project Pass or a monthly plan.",
  free: {
    name: "Explore", price: "$0", description: "Browse dancers before choosing a plan.",
    cta: { label: "Explore free", href: "/signup?account_type=lookingForTalent" },
    features: ["Browse dancer profiles", "Choose a plan when you’re ready to run a project"]
  },
  pro: {
    name: "Studio", price: "$149", period: "USD / month",
    description: "Casting and cast coordination for one active project.",
    cta: { label: "Get started", href: "/checkout?plan=studio" },
    features: ["1 active project at a time", "3 team members", "Reuse your slot when a project wraps", "Project Pass and Production House options on our pricing page"],
    highlighted: true
  }
};

export const communityPricingContent: IndustryPricingContent = {
  "variant": "industry",
  "title": "Community plans",
  "description": "Start free. Upgrade when you need more.",
  "free": {
    "name": "Free",
    "price": "$0",
    "period": "forever",
    "description": "Explore Motiion with the essentials.",
    "cta": {
      "label": "Sign up free",
      "href": "/signup?account_type=talent"
    },
    "features": [
      "Up to 4 headshots",
      "Reel & slate videos only",
      "Highlight up to 2 portfolio credits",
      "Favorites & Notify me included; create & share custom lists with Pro",
      "Browse open castings — profile matches unlock with Talent Pro"
    ]
  },
  "pro": {
    "name": "Motiion Pro",
    "price": "$4.99",
    "period": "USD / month",
    "description": "More ways to connect with the dance community.",
    "cta": {
      "label": "Get Motiion Pro in the app",
      "href": getIosAppStoreUrl()
    },
    "features": [
      "Premium community access",
      "Classes and events in one place",
      "Discover and connect with people",
      "Community activity and updates"
    ],
    "highlighted": true
  }
};
