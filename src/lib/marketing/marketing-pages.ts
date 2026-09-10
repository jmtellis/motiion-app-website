import type { FaqItem } from "@/lib/marketing/homepage-content";
import type { AudiencePricingContent } from "@/lib/marketing/audience-pricing";
import { industryPricingContent, talentPricingContent } from "@/lib/marketing/audience-pricing";

export type MarketingTab = "community" | "talent" | "casting";

export const JOIN_BETA_CTA = { label: "Sign up", href: "/signup" } as const;
export const INDUSTRY_PRO_SIGNUP_CTA = { label: "Sign up", href: "/signup" } as const;

export const marketingAudienceTabs: { id: MarketingTab; label: string; href: string }[] = [
  { id: "community", label: "Community", href: "/community" },
  { id: "talent", label: "Talent", href: "/for-talent" },
  { id: "casting", label: "Industry Professionals", href: "/for-casting" },
];

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
  workflowAside?: "blank" | "trust";
  trustTitle: string;
  trustPoints: string[];
  faq: FaqItem[];
  pricing?: AudiencePricingContent;
};

export const talentPageContent: AudiencePageContent = {
  eyebrow: "Talent",
  headline: "One profile. Better opportunities. Less friction.",
  summary:
    "Motiion helps dancers and choreographers build a living professional identity, get discovered by the right teams, and respond to invites without rebuilding materials every time.",
  heroCtas: {
    primary: JOIN_BETA_CTA,
  },
  benefitsTitle: "Why join Motiion?",
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
  workflowAside: "blank",
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
        "You can start on the Free plan and upgrade to Pro when you need more visibility, media, and workflow tools. See pricing below for dancer and choreographer plans.",
    },
  ],
  pricing: talentPricingContent,
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
  workflowAside: "blank",
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
  eyebrow: "Community",
  headline: "Find the rooms, classes, and programs around you.",
  summary:
    "Motiion helps the dance community discover events, take class, and join programs—so showing up and staying connected does not depend on a group chat or a flyer.",
  heroCtas: {
    primary: JOIN_BETA_CTA,
  },
  benefitsTitle: "Why the community is on Motiion",
  benefits: [
    {
      title: "Events nearby",
      description:
        "See live appearances, activations, and gatherings in one place instead of piecing nights together across stories and texts.",
      icon: "sparkles",
      featured: true,
    },
    {
      title: "Classes and training",
      description:
        "Find open classes, sessions, and studios when you want to train—not only when someone happens to post.",
      icon: "users",
      featured: true,
    },
    {
      title: "Programs that develop you",
      description:
        "Discover intensives, workshops, and longer programs without hunting through a dozen organizers.",
      icon: "images",
    },
    {
      title: "One place to follow along",
      description:
        "Keep events, classes, and programs in the same network the industry already uses to find dancers.",
      icon: "layout-dashboard",
    },
    {
      title: "Show up with context",
      description:
        "RSVP and get the details that matter—who is hosting, where it is, and what to expect—before you walk in.",
      icon: "mail",
    },
    {
      title: "Grow with the scene",
      description:
        "Stay connected to the people and rooms that shape your practice, whether you are just starting or already working.",
      icon: "user-circle",
    },
  ],
  workflowTitle: "How it works for the community",
  workflowSteps: [
    "Create a free Motiion account and tell us you are here for the community.",
    "Browse events, classes, and programs happening around you.",
    "Save what you care about and get the details before you go.",
    "Keep coming back as the calendar, the rooms, and the people change.",
  ],
  workflowAside: "blank",
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
