import type { FaqItem } from "@/lib/marketing/homepage-content";
import type { AudiencePricingContent } from "@/lib/marketing/audience-pricing";
import { industryPricingContent, talentPricingContent } from "@/lib/marketing/audience-pricing";

export type MarketingTab = "community" | "talent" | "casting";

export const JOIN_BETA_CTA = { label: "Create your profile", href: "/signup?account_type=talent" } as const;
export const INDUSTRY_PRO_SIGNUP_CTA = { label: "Sign up", href: "/signup" } as const;

/** Root landing and other pages where no audience tab is selected. */
export type MarketingHeaderTab = MarketingTab | null;

export const LANDING_DEFAULT_AUDIENCE: MarketingTab = "casting";

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
    "Our mobile app brings your portfolio and experience together, helps you get discovered, and connects you to your next opportunity.",
  heroCtas: {
    primary: { label: "Create your profile", href: "/signup?account_type=talent" },
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
      question: "Can I keep my agent involved?",
      answer:
        "Yes. Add your agent’s contact information, and they’ll be CC’d on all correspondence about jobs you book through Motiion.",
    },
    {
      question: "Can I update my profile after every booking?",
      answer:
        "Yes. Your profile updates automatically from Motiion-tracked events, and you can easily add other experiences as you go. With a Pro membership, you can generate an updated résumé to print right from the Motiion app.",
    },
    {
      question: "Is there a cost to join?",
      answer:
        "You can start on the Free plan and upgrade to Pro when you need more visibility, media, and workflow tools.",
      answerLink: { label: "See pricing", href: "/pricing?audience=talent" },
    },
  ],
  pricing: talentPricingContent,
};

export const castingPageContent: AudiencePageContent = {
  eyebrow: "Casting & creative teams",
  headline: "Find your talent. Bring your project together.",
  summary:
    "Discover dancers and choreographers, organize your rosters, and manage projects across the website and mobile app.",
  heroCtas: {
    primary: { label: "Start your application", href: "/signup" },
  },
  benefitsTitle: "What you can do",
  benefits: [
    {
      title: "Find the right dancers.",
      description:
        "Start with your brief. Explore Motiion’s network by style, experience, and location to find dancers who fit your vision.",
      icon: "search",
      featured: true,
      preview: "industry-navigator",
    },
    {
      title: "Build your cast.",
      description: "Share casting opportunities, review submissions, and collaborate on shortlists to choose your cast.",
      icon: "bookmark",
      featured: true,
      preview: "industry-roster",
    },
    {
      title: "Confirm your cast.",
      description:
        "Check availability, place dancers on hold, and confirm your cast. Move confirmed dancers into bookings whenever your project needs them.",
      icon: "folder-kanban",
      featured: true,
      preview: "industry-projects",
    },
  ],
  workflowTitle: "From your brief to your cast",
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
      question: "Who is Motiion built for?",
      answer:
        "Casting directors, creative directors, producers, managers, agencies, recruiters, choreographers hiring for projects, and any team that discovers, organizes, and books dance talent.",
    },
    {
      question: "Is Motiion a talent agency?",
      answer:
        "No. Motiion is infrastructure for discovery, roster management, and project workflow—we do not represent talent.",
    },
    {
      question: "How do I get started?",
      answer: "Create an account and complete your hiring application. Once approved, you can set up your workspace and start discovering talent.",
    },
    {
      question: "Can I organize talent for different projects?",
      answer: "Yes. Save talent to rosters and keep project details, casting roles, and submissions together so your team can review the right people in context.",
    },
    {
      question: "Can I share a shortlist with my client?",
      answer: "Yes. Share shortlists for client review and keep casting decisions connected to the project. Available sharing tools and limits depend on your plan.",
    },
    {
      question: "Can I use Motiion on the web and on my phone?",
      answer: "Yes. Use the website for your workspace and the mobile app to stay connected to your talent and projects on the go.",
    },
    {
      question: "Which plan is right for my team?",
      answer: "Compare casting, roster, and collaboration limits to choose the plan that fits your workload.",
      answerLink: { label: "Compare plans", href: "/pricing?audience=casting" },
    },
  ],
  pricing: industryPricingContent,
};

export const landingAudienceSegments = [
  { id: "casting", label: "Casting & creative teams", content: castingPageContent },
  { id: "talent", label: "Professional Dancers", content: talentPageContent },

] as const;

export function parseAudienceParam(value: string | undefined): MarketingTab {
  return landingAudienceSegments.some((segment) => segment.id === value)
    ? (value as MarketingTab)
    : LANDING_DEFAULT_AUDIENCE;
}
