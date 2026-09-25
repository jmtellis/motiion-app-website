import type { FaqItem } from "@/lib/marketing/homepage-content";
import type { AudiencePricingContent } from "@/lib/marketing/audience-pricing";
import { industryPricingContent, talentPricingContent } from "@/lib/marketing/audience-pricing";

export type MarketingTab = "community" | "talent" | "casting";

export const JOIN_BETA_CTA = { label: "Sign up", href: "/signup" } as const;
export const INDUSTRY_PRO_SIGNUP_CTA = { label: "Sign up", href: "/signup" } as const;

/** Root landing and other pages where no audience tab is selected. */
export type MarketingHeaderTab = MarketingTab | null;

export const LANDING_DEFAULT_AUDIENCE: MarketingTab = "talent";

export type BenefitIconKey =
  | "images"
  | "search"
  | "mail"
  | "user-circle"
  | "users"
  | "sparkles"
  | "folder-kanban"
  | "bookmark"
  | "list-checks"
  | "layout-dashboard"
  | "message-square";

export type BenefitPreviewKind =
  | "talent-portfolio"
  | "talent-discovery"
  | "talent-inbox"
  | "talent-identity"
  | "industry-navigator"
  | "industry-projects"
  | "industry-roster"
  | "industry-shortlist"
  | "community-event";

export type AudienceBenefit = {
  title: string;
  description: string;
  icon: BenefitIconKey;
  featured?: boolean;
  preview?: BenefitPreviewKind;
};

export type AudiencePageContent = {
  eyebrow: string;
  headline: string;
  summary: string;
  heroCtas: { primary: { label: string; href: string }; secondary?: { label: string; href: string } };
  benefitsTitle: string;
  benefits: AudienceBenefit[];
  workflowTitle: string;
  workflowSteps: string[];
  trustTitle: string;
  trustPoints: string[];
  faq: FaqItem[];
  pricing?: AudiencePricingContent;
};

export const talentPageContent: AudiencePageContent = {
  eyebrow: "Professional Dancers",
  headline: "Your work deserves to be seen.",
  summary:
    "Bring your portfolio and experience together, get discovered, and find your next opportunity.",
  heroCtas: {
    primary: { label: "Create your profile", href: "/signup" },
  },
  benefitsTitle: "What you can do",
  benefits: [
    {
      title: "Show your work",
      description:
        "Keep your portfolio, reels, credits, and professional experience in one profile that stays current as your career moves.",
      icon: "images",
      featured: true,
      preview: "talent-portfolio",
    },
    {
      title: "Get discovered",
      description:
        "Help industry teams find relevant talent by style, skills, and experience. Credentials can show a verification status when they have been confirmed—a profile is not treated as verified until it is.",
      icon: "search",
      featured: true,
      preview: "talent-discovery",
    },
    {
      title: "Find opportunities",
      description:
        "See casting opportunities and receive invites in one place, then respond with the profile industry teams already have.",
      icon: "mail",
      featured: true,
      preview: "talent-inbox",
    },
  ],
  workflowTitle: "How it works for talent",
  workflowSteps: [
    "Create your account and finish onboarding with your core materials.",
    "Publish your portfolio with credits, visuals, and highlights.",
    "Get discovered in search and receive targeted invites.",
    "Manage messages, schedule, and opportunities from one home base.",
  ],
  trustTitle: "Designed for working artists",
  trustPoints: [
    "Search-safe profiles that protect personal details while staying discoverable.",
    "Mobile-first workflow aligned with how dancers and choreographers actually book work.",
    "One source of truth for everything industry teams see about you.",
  ],
  faq: [
    {
      question: "Who is the talent experience for?",
      answer:
        "Dancers and choreographers who need a professional presence and a clearer path to opportunities—whether you perform, create, or both.",
    },
    {
      question: "Do I need representation to sign up?",
      answer: "No. Motiion supports both represented and independent talent.",
    },
    {
      question: "Can I update my profile after every booking?",
      answer:
        "Yes. Your Motiion portfolio is meant to evolve as reels, credits, and availability change.",
    },
    {
      question: "Is there a cost to join?",
      answer:
        "You can start on the Free plan and upgrade to Pro when you need more visibility, media, and workflow tools. See pricing above for dancer and choreographer plans.",
    },
  ],
  pricing: talentPricingContent,
};

export const castingPageContent: AudiencePageContent = {
  eyebrow: "Industry Professionals",
  headline: "Find your talent. Bring your project together.",
  summary:
    "Discover dancers and choreographers, build rosters, and manage castings in one workspace.",
  heroCtas: {
    primary: { label: "Create an industry account", href: "/signup" },
  },
  benefitsTitle: "What you can do",
  benefits: [
    {
      title: "Discover talent",
      description:
        "Search and review professional profiles by style, experience, and location. Verification is shown when a credential has been confirmed, not assumed for every profile.",
      icon: "search",
      featured: true,
      preview: "industry-navigator",
    },
    {
      title: "Build your roster",
      description: "Save and organize the talent you want to work with again.",
      icon: "bookmark",
      featured: true,
      preview: "industry-roster",
    },
    {
      title: "Manage castings",
      description:
        "Run projects, collect submissions, and collaborate with your team from discovery through a decision.",
      icon: "folder-kanban",
      featured: true,
      preview: "industry-projects",
    },
  ],
  workflowTitle: "How it works for industry professionals",
  workflowSteps: [
    "Create your account and tell us how your team hires and manages talent.",
    "Search the Motiion talent database and save people to your roster.",
    "Create projects and publish castings with roles, requirements, and submission details.",
    "Build shortlists, collaborate with stakeholders, and move from discovery to confirmation.",
  ],
  trustTitle: "Built for production timelines",
  trustPoints: [
    "Reduces time-to-shortlist on fast-moving projects.",
    "Keeps rosters, castings, and project context in one connected workflow.",
    "Uses current talent profiles so decisions are made on facts, not stale PDFs.",
  ],
  faq: [
    {
      question: "Who is the industry professional experience for?",
      answer:
        "Casting directors, creative directors, producers, managers, agencies, recruiters, choreographers hiring for projects, and any team that discovers, organizes, and books dance talent.",
    },
    {
      question: "Is Motiion a talent agency?",
      answer:
        "No. Motiion is infrastructure for discovery, roster management, and project workflow—we do not represent talent.",
    },
    {
      question: "Can we search before signing up?",
      answer:
        "Yes. You can browse public talent profiles, then create an account when you are ready to build rosters, create projects, and collaborate.",
    },
  ],
  pricing: industryPricingContent,
};

export const communityPageContent: AudiencePageContent = {
  eyebrow: "Community Members",
  headline: "Find your place in dance.",
  summary:
    "Discover the people, classes, and events that keep you connected to the dance world.",
  heroCtas: {
    primary: { label: "Join the community", href: "/signup" },
  },
  benefitsTitle: "What you can do",
  benefits: [
    {
      title: "Discover people",
      description: "Explore dancers and the work they’re part of.",
      icon: "user-circle",
      featured: true,
      preview: "talent-discovery",
    },
    {
      title: "Find classes and training",
      description: "Look for classes, workshops, and programs in the same place you follow the scene.",
      icon: "users",
      featured: true,
    },
    {
      title: "Explore events",
      description: "Discover performances and community gatherings, including who is part of the cast.",
      icon: "sparkles",
      featured: true,
      preview: "community-event",
    },
  ],
  workflowTitle: "How it works for the community",
  workflowSteps: [
    "Create a free Motiion account and tell us you are here for the community.",
    "Browse events, classes, and programs happening around you.",
    "Save what you care about and get the details before you go.",
    "Keep coming back as the calendar, the rooms, and the people change.",
  ],
  trustTitle: "Built for people who show up",
  trustPoints: [
    "Made for dancers, students, and fans who want a clearer way into the scene.",
    "Keeps community discovery on the same platform hiring teams already use.",
    "Grows from events and class into a longer relationship with the work.",
  ],
  faq: [
    {
      question: "Who is the community experience for?",
      answer:
        "Anyone who wants to find dance events, classes, and programs—students, working dancers, and people who love the scene but are not hiring or building a booking profile yet.",
    },
    {
      question: "How is this different from a talent profile?",
      answer:
        "Community is for discovery and showing up. A talent profile is for getting hired. You can start in the community and add a professional profile later if you want to be discovered for work.",
    },
    {
      question: "Do I need an industry account to browse?",
      answer:
        "No. Community accounts are for finding events, classes, and programs—not for running castings or hiring.",
    },
    {
      question: "Is there a cost to join?",
      answer: "You can create a free community account and start exploring from there.",
    },
  ],
};

export const landingAudienceSegments = [
  { id: "casting", label: "Industry Professionals", content: castingPageContent },
  { id: "talent", label: "Professional Dancers", content: talentPageContent },
  { id: "community", label: "Community Members", content: communityPageContent },
] as const;

export function parseAudienceParam(value: string | undefined): MarketingTab {
  return landingAudienceSegments.some((segment) => segment.id === value)
    ? (value as MarketingTab)
    : LANDING_DEFAULT_AUDIENCE;
}
