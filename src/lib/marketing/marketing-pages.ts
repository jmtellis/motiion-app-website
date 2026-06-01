import type { FaqItem } from "@/lib/marketing/homepage-content";

export type MarketingTab = "talent" | "clients" | "agents" | "demo";

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
  eyebrow: "For talent",
  headline: "One profile. Better opportunities. Less admin.",
  summary:
    "Motiion helps dancers and choreographers build a living professional identity, get discovered by the right teams, and respond to invites without rebuilding materials every time.",
  heroCtas: {
    primary: JOIN_BETA_CTA,
    secondary: { label: "Request a demo", href: "/request-demo" },
  },
  benefitsTitle: "Why talent joins Motiion",
  benefits: [
    {
      title: "A portfolio that stays current",
      description:
        "Keep headshots, reels, credits, training, and sizing in one place that updates as your career moves.",
    },
    {
      title: "Get found by the right people",
      description:
        "Show up in search with style, skills, and experience filters casting teams actually use.",
    },
    {
      title: "Respond faster to real invites",
      description:
        "Class, session, event, and casting invites land in one inbox so you can accept or decline with context.",
    },
    {
      title: "Stop rebuilding the same packet",
      description:
        "Share one verified Motiion profile instead of chasing links, PDFs, and outdated folders for every submission.",
    },
    {
      title: "Built for represented and independent artists",
      description:
        "Whether you book on your own or through an agency, your materials stay presentation-ready.",
    },
    {
      title: "Grow with the community",
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

export const clientsPageContent: AudiencePageContent = {
  eyebrow: "For clients",
  headline: "Discover talent faster. Decide with confidence.",
  summary:
    "Motiion gives casting directors, creative teams, producers, and agencies a trusted layer for search, shortlists, and outreach—built on profiles that stay current.",
  heroCtas: {
    primary: JOIN_BETA_CTA,
    secondary: { label: "Request a demo", href: "/request-demo" },
  },
  benefitsTitle: "Why teams use Motiion",
  benefits: [
    {
      title: "Search built for dance casting",
      description:
        "Filter by style, experience, location, and talent type instead of scrolling social feeds and email threads.",
    },
    {
      title: "Profiles you can trust",
      description:
        "Review verified headshots, reels, credits, and highlights without chasing outdated links.",
    },
    {
      title: "Faster shortlists",
      description:
        "Save, compare, and share candidates with collaborators so review cycles stay focused on creative fit.",
    },
    {
      title: "Less admin between brief and booking",
      description:
        "Centralize discovery, outreach, and context instead of rebuilding spreadsheets for every project.",
    },
    {
      title: "Works for agencies and in-house teams",
      description:
        "Whether you manage rosters or run project-based casting, Motiion scales to your workflow.",
    },
    {
      title: "Clearer communication",
      description:
        "Keep conversations tied to roles, classes, and sessions so nothing gets lost across tools.",
    },
  ],
  workflowTitle: "How it works for clients",
  workflowSteps: [
    "Create your hiring account and tell us how your team casts.",
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
      question: "Who counts as a client on Motiion?",
      answer:
        "Casting teams, creative directors, producers, managers, agencies, recruiters, and any team hiring dance talent.",
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
      "Tell us how your team hires and casts. We'll follow up with early access details for client accounts.",
  },
};

export const agentsPageContent: AudiencePageContent = {
  eyebrow: "For agents",
  headline: "Your roster CMS—not another inbox to babysit.",
  summary:
    "Motiion is the content system for your represented talent: one living database for every artist on your roster, with direct communication built in so you are not relaying messages between casting and your clients.",
  heroCtas: {
    primary: JOIN_BETA_CTA,
    secondary: { label: "Request a demo", href: "/request-demo" },
  },
  benefitsTitle: "Why agents and managers use Motiion",
  benefits: [
    {
      title: "A CMS built for rosters",
      description:
        "Organize headshots, reels, credits, availability, and highlights per artist—the way a modern CMS organizes content, not the way a spreadsheet pretends to.",
    },
    {
      title: "One talent database that stays current",
      description:
        "Your roster updates in one place so every submission, shortlist, and invite pulls from materials you trust.",
    },
    {
      title: "Talk to talent where the work lives",
      description:
        "Bookings, classes, and casting context stay tied to the right profile—without you forwarding threads across email, text, and social DMs.",
    },
    {
      title: "Less relay, more representation",
      description:
        "When communication is direct on Motiion, you spend time on advocacy, strategy, and deals—not retyping messages between parties.",
    },
    {
      title: "Represent more artists on what matters",
      description:
        "Scale your roster without scaling chaos. Spend your hours on the conversations and decisions only an agent can own.",
    },
    {
      title: "Built for dance-first representation",
      description:
        "Starting with dance, Motiion speaks the language of credits, reels, and casting workflows your roster already runs on.",
    },
  ],
  workflowTitle: "How it works for agents",
  workflowSteps: [
    "Create your account and set up your agency or management profile.",
    "Add artists to your roster with profiles that stay current as their careers move.",
    "Discover opportunities, submit, and coordinate without juggling disconnected tools.",
    "Keep direct lines open on Motiion so you represent more talent on the work that matters.",
  ],
  trustTitle: "Infrastructure for modern representation",
  trustPoints: [
    "Motiion is roster and casting infrastructure—not a CRM for sales pipelines.",
    "Keeps your team aligned on who is submitted, booked, and in conversation.",
    "Designed so agents stay in the loop without becoming the bottleneck.",
  ],
  faq: [
    {
      question: "Is Motiion a CRM?",
      answer:
        "No. Motiion is closer to a CMS for your roster—a structured talent database with discovery, booking, and messaging built for representation, not generic customer records.",
    },
    {
      question: "Who is the agents experience for?",
      answer:
        "Talent agents, managers, and representation teams who maintain rosters and coordinate bookings across multiple artists.",
    },
    {
      question: "How does messaging work?",
      answer:
        "Casting, talent, and your team communicate in context on Motiion—so you are not the default relay between every party on every project.",
    },
    {
      question: "Can we request a team walkthrough?",
      answer:
        "Yes. Use Request a Demo and we will show you how Motiion fits your roster workflow.",
    },
  ],
  betaSignup: {
    eyebrow: "Join Beta",
    title: "Request beta access",
    description:
      "Tell us you represent talent on Motiion. We'll reach out with early access for agents and management teams.",
  },
};

export const demoPageContent = {
  eyebrow: "Request a demo",
  headline: "Talk with the Motiion team",
  summary:
    "Tell us whether you are talent or a client, share your contact details, and we will follow up to show you how Motiion fits your workflow.",
};
