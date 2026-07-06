import type { FaqItem } from "@/lib/marketing/homepage-content";

export type MarketingTab = "talent" | "casting";

export const JOIN_BETA_CTA = { label: "Join Beta", href: "#signup" } as const;
export const INDUSTRY_PRO_SIGNUP_CTA = { label: "Sign up", href: "/talent-buyers/signup" } as const;

/** Root landing and other pages where no audience tab is selected. */
export type MarketingHeaderTab = MarketingTab | null;

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
  | "industry-navigator"
  | "industry-projects"
  | "industry-roster"
  | "industry-shortlist";

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
  betaSignup: {
    eyebrow: string;
    title: string;
    description: string;
  };
};

export const talentPageContent: AudiencePageContent = {
  eyebrow: "Talent",
  headline: "One profile. Better opportunities. Less friction.",
  summary:
    "Motiion helps dancers and choreographers build a living professional identity, get discovered by the right teams, and respond to invites without rebuilding materials every time.",
  heroCtas: {
    primary: JOIN_BETA_CTA,
  },
  benefitsTitle: "Why dancers and choreographers join Motiion",
  benefits: [
    {
      title: "Living portfolio",
      description:
        "Keep headshots, reels, credits, training, and sizing in one place that updates as your career moves.",
      icon: "images",
      featured: true,
      preview: "talent-portfolio",
    },
    {
      title: "Right discovery",
      description:
        "Show up in search with style, skills, and experience filters industry teams actually use.",
      icon: "search",
      featured: true,
      preview: "talent-discovery",
    },
    {
      title: "Faster invites",
      description:
        "Class, session, event, and casting invites land in one inbox so you can accept or decline with context.",
      icon: "mail",
    },
    {
      title: "One profile",
      description:
        "Share one verified Motiion profile instead of chasing links, PDFs, and outdated folders for every submission.",
      icon: "user-circle",
    },
    {
      title: "Any representation",
      description:
        "Whether you book on your own or through an agency, your materials stay presentation-ready.",
      icon: "users",
    },
    {
      title: "Community growth",
      description:
        "Discover classes, sessions, and collaborators on the same network hiring teams use every day.",
      icon: "sparkles",
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
        "You can sign up and build your profile during our early access period. Reach out if you have questions about upcoming plans.",
    },
  ],
  betaSignup: {
    eyebrow: "Join Beta",
    title: "Request beta access",
    description:
      "Tell us you're joining as talent. We'll invite you during our early access wave and reach out as spots open.",
  },
};

export const castingPageContent: AudiencePageContent = {
  eyebrow: "Industry Professionals",
  headline: "Discover talent. Build rosters. Run projects.",
  summary:
    "Motiion gives casting directors, creative teams, producers, agencies, and choreographers one workspace to search the talent database, manage rosters, create castings, and keep projects moving from discovery to confirmation.",
  heroCtas: {
    primary: INDUSTRY_PRO_SIGNUP_CTA,
  },
  benefitsTitle: "Why industry professionals use Motiion",
  benefits: [
    {
      title: "Talent database",
      description:
        "Search verified dancers and choreographers by style, experience, location, and talent type instead of scrolling social feeds and email threads.",
      icon: "search",
      featured: true,
      preview: "industry-navigator",
    },
    {
      title: "Project workspace",
      description:
        "Create projects, publish castings with roles and submission rules, and track progress from draft to live.",
      icon: "folder-kanban",
      featured: true,
      preview: "industry-projects",
    },
    {
      title: "Roster management",
      description:
        "Save talent, organize rosters, and keep your go-to people accessible for the next brief or production.",
      icon: "bookmark",
    },
    {
      title: "Faster shortlists",
      description:
        "Compare candidates, share selections with collaborators, and move review cycles from debate to decision.",
      icon: "list-checks",
    },
    {
      title: "Less admin",
      description:
        "Centralize discovery, outreach, and project context instead of rebuilding spreadsheets for every job.",
      icon: "layout-dashboard",
    },
    {
      title: "Clear communication",
      description:
        "Keep conversations tied to roles, castings, and sessions so nothing gets lost across tools.",
      icon: "message-square",
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
  betaSignup: {
    eyebrow: "Join Beta",
    title: "Request beta access",
    description:
      "Tell us how your team discovers talent and manages projects. We'll follow up with early access details for industry professional accounts.",
  },
};
