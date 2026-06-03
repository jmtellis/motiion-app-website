import type { FaqItem } from "@/lib/marketing/homepage-content";

export type MarketingTab = "talent" | "casting" | "demo";

export const JOIN_BETA_CTA = { label: "Join Beta", href: "#signup" } as const;

/** Root landing and other pages where no audience tab is selected. */
export type MarketingHeaderTab = MarketingTab | null;

export type AudiencePageContent = {
  eyebrow: string;
  headline: string;
  summary: string;
  heroCtas: { primary: { label: string; href: string }; secondary: { label: string; href: string } };
  benefitsTitle: string;
  benefits: { title: string; description: string }[];
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
  eyebrow: "For Dancers",
  headline: "One profile. Better opportunities. Less friction.",
  summary:
    "Motiion helps dancers and choreographers build a living professional identity, get discovered by the right teams, and respond to invites without rebuilding materials every time.",
  heroCtas: {
    primary: JOIN_BETA_CTA,
    secondary: { label: "Request a demo", href: "/request-demo" },
  },
  benefitsTitle: "Why talent joins Motiion",
  benefits: [
    {
      title: "Living portfolio",
      description:
        "Keep headshots, reels, credits, training, and sizing in one place that updates as your career moves.",
    },
    {
      title: "Right discovery",
      description:
        "Show up in search with style, skills, and experience filters casting teams actually use.",
    },
    {
      title: "Faster invites",
      description:
        "Class, session, event, and casting invites land in one inbox so you can accept or decline with context.",
    },
    {
      title: "One profile",
      description:
        "Share one verified Motiion profile instead of chasing links, PDFs, and outdated folders for every submission.",
    },
    {
      title: "Any representation",
      description:
        "Whether you book on your own or through an agency, your materials stay presentation-ready.",
    },
    {
      title: "Community growth",
      description:
        "Discover classes, sessions, and collaborators on the same network hiring teams use every day.",
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
    "Mobile-first workflow aligned with how talent actually books work.",
    "One source of truth for everything casting sees about you.",
  ],
  faq: [
    {
      question: "Who is the talent experience for?",
      answer:
        "Dancers, choreographers, and other performing artists who need a professional presence and a clearer path to opportunities.",
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
  eyebrow: "For Choreographers & Casting",
  headline: "Discover talent faster. Decide with confidence.",
  summary:
    "Motiion gives casting directors, creative teams, producers, and agencies a trusted layer for search, shortlists, and outreach—built on profiles that stay current.",
  heroCtas: {
    primary: JOIN_BETA_CTA,
    secondary: { label: "Request a demo", href: "/request-demo" },
  },
  benefitsTitle: "Why casting teams use Motiion",
  benefits: [
    {
      title: "Dance search",
      description:
        "Filter by style, experience, location, and talent type instead of scrolling social feeds and email threads.",
    },
    {
      title: "Trusted profiles",
      description:
        "Review verified headshots, reels, credits, and highlights without chasing outdated links.",
    },
    {
      title: "Faster shortlists",
      description:
        "Save, compare, and share candidates with collaborators so review cycles stay focused on creative fit.",
    },
    {
      title: "Less admin",
      description:
        "Centralize discovery, outreach, and context instead of rebuilding spreadsheets for every project.",
    },
    {
      title: "Any team",
      description:
        "Whether you manage rosters or run project-based casting, Motiion scales to your workflow.",
    },
    {
      title: "Clear communication",
      description:
        "Keep conversations tied to roles, classes, and sessions so nothing gets lost across tools.",
    },
  ],
  workflowTitle: "How casting works on Motiion",
  workflowSteps: [
    "Create your casting account and tell us how your team hires.",
    "Search Motiion talent with practical filters and saved views.",
    "Build shortlists and share them with stakeholders.",
    "Reach out and move from discovery to confirmation with full context.",
  ],
  trustTitle: "Built for production timelines",
  trustPoints: [
    "Reduces time-to-shortlist on fast-moving projects.",
    "Improves consistency across reviewers and collaborators.",
    "Keeps talent data current so decisions are made on facts, not stale PDFs.",
  ],
  faq: [
    {
      question: "Who is the casting experience for?",
      answer:
        "Casting directors, creative directors, producers, managers, agencies, recruiters, and any team hiring dance talent.",
    },
    {
      question: "Is Motiion a talent agency?",
      answer:
        "No. Motiion is infrastructure for discovery and casting workflow—we do not represent talent.",
    },
    {
      question: "Can we search before signing up?",
      answer:
        "Yes. You can browse public talent profiles, then create an account when you are ready to hire and collaborate.",
    },
    {
      question: "Can we request a walkthrough for our team?",
      answer:
        "Absolutely. Use the Request a Demo form and we will schedule time with your team.",
    },
  ],
  betaSignup: {
    eyebrow: "Join Beta",
    title: "Request beta access",
    description:
      "Tell us how your team hires and casts. We'll follow up with early access details for casting accounts.",
  },
};

export const demoPageContent = {
  eyebrow: "Request a demo",
  headline: "Talk with the Motiion team",
  summary:
    "Tell us whether you are talent or a client, share your contact details, and we will follow up to show you how Motiion fits your workflow.",
};
