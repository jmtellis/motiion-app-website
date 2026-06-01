export type FaqItem = {
  question: string;
  answer: string;
};

export type CtaLink = {
  label: string;
  href: string;
};

export type NarrativePillar = {
  title: string;
  description: string;
};

export type AudienceKey = "dancers" | "choreographers" | "talentAgents" | "castingReps";

export type AudienceProfile = {
  key: AudienceKey;
  label: string;
  selectorLabel: string;
  headline: string;
  summary: string;
  valueStatement: string;
  benefits: string[];
  workflowSteps: string[];
  trustPoints: string[];
  ctaPrimary: CtaLink;
  ctaSecondary: CtaLink;
  faq: FaqItem[];
};

export const homeHero = {
  eyebrow: "The solution",
  headline: {
    lead: "We simplified the chaos and put it into ",
    brand: "Motiion",
  },
  pillars: [
    {
      number: 1,
      title: "Discover smarter",
      description: "Connecting the right talent to the right opportunities.",
    },
    {
      number: 2,
      title: "Verify instantly",
      description: "One digital identity that evolves with every job.",
    },
    {
      number: 3,
      title: "Decide faster",
      description: "Everything needed to instantly move from casting to confirmation.",
    },
  ],
  blueprint:
    "Starting with dance, we've created the blueprint for how the entire creative world hires talent—and the infrastructure to support their careers.",
  audienceLinks: [
    {
      id: "talent",
      label: "For Talent",
      href: "/for-talent",
      description: "Build your profile, get discovered, and book what's next.",
    },
    {
      id: "clients",
      label: "For Clients",
      href: "/for-clients",
      description: "Search verified talent and move from casting to confirmation faster.",
    },
    {
      id: "agents",
      label: "For Agents",
      href: "/for-agents",
      description:
        "Run your roster like a CMS—one database for your artists, with direct communication so you represent more talent on what matters.",
    },
  ],
  demoCta: {
    label: "Join Beta",
    href: "#signup",
    hint: "Request early access and help shape Motiion before public launch.",
  },
};

export const homepageIntro = {
  eyebrow: "Professional talent infrastructure",
  title: "For those with the audacity to pursue their dreams.",
  description:
    "Starting with dance, Motiion is building the blueprint for how the creative world discovers and hires talent.",
};

export const problemSection = {
  title: "The problem",
  headline: "The entertainment industry is evolving, but the infrastructure is not.",
  intro:
    "Creativity is accelerating. The systems behind discovery, verification, and hiring have not kept up—so both talent and teams lose time, trust, and momentum.",
  points: [
    "Talent struggle to be seen by the right people at the right time.",
    "Casting teams waste hours searching social feeds and email threads without a trusted source of current profile data.",
    "Bookings, availability checks, and logistics get buried in fragmented communication, turning fast opportunities into slow decisions.",
  ],
};

export const betaSignupSection = {
  eyebrow: "Join Beta",
  title: "Request beta access",
  description: "We're currently inviting a limited number of early users.",
};

export const solutionSection = {
  title: "The solution",
  headline: `${homeHero.headline.lead}${homeHero.headline.brand}`,
  pillars: homeHero.pillars.map(({ title, description }) => ({ title, description })) as NarrativePillar[],
  summary: homeHero.blueprint,
};

export const visionSection = {
  title: "Company vision",
  headline: "Moving the industry forward",
  body: [
    "Motiion exists to close the gap between how fast entertainment moves and how slowly hiring infrastructure still operates.",
    "We empower creatives to build lasting careers with tools that support their craft—so teams can discover, verify, and confirm talent in one connected flow.",
    "Starting with dance, we're proving the model for how the entire creative world hires—and giving talent the infrastructure their careers deserve.",
  ],
};

export const homeAudienceLinks = [
  {
    label: "For Talent",
    description: "Build a living profile, get discovered, and respond to real opportunities.",
    href: "/for-talent",
  },
  {
    label: "For Clients",
    description: "Search verified talent, run casting, and move from shortlist to confirmation faster.",
    href: "/for-clients",
  },
  {
    label: "For Agents",
    description:
      "Your roster CMS—one database for your artists, with direct communication so you focus on representation.",
    href: "/for-agents",
  },
  {
    label: "Request a Demo",
    description: "See how Motiion fits your team before you roll it out.",
    href: "/request-demo",
  },
] as const;

export const productSection = {
  title: "Product",
  headline: "A practical system for discovery, verification, and booking readiness.",
  capabilities: [
    "AI-powered discovery to connect talent with active opportunities.",
    "Smart notifications that surface role matches based on skills and goals.",
    "Verified profile search with reels, credits, and practical filters.",
    "Living digital profiles that stay current as careers evolve.",
    "Centralized communication for availability, logistics, and updates.",
    "Transparent decision support so teams move confidently while talent stays informed.",
  ],
};

export const audienceOrder: AudienceKey[] = [
  "dancers",
  "choreographers",
  "talentAgents",
  "castingReps",
];

export const audienceProfiles: Record<AudienceKey, AudienceProfile> = {
  dancers: {
    key: "dancers",
    label: "Dancers",
    selectorLabel: "Dancers",
    headline: "Keep your profile current and discover better-fit opportunities faster.",
    summary:
      "Motiion gives dancers one living professional profile that keeps pace with real careers and helps the right teams discover you.",
    valueStatement:
      "A modern profile and discovery layer built for dancers who need visibility without constant admin.",
    benefits: [
      "Maintain one verified profile with reels, credits, and availability.",
      "Get surfaced to casting teams with stronger skill and style matching.",
      "Respond to opportunities quickly with consistent, current materials.",
      "Reduce repeated profile rebuilding across different submissions.",
    ],
    workflowSteps: [
      "Set up your profile once with media, credits, and tags.",
      "Keep updates current as new jobs and reels are added.",
      "Receive opportunities aligned with your skills and goals.",
      "Submit with confidence from one source of truth.",
    ],
    trustPoints: [
      "Built for represented and independent talent.",
      "Search-safe profile handling protects personal context while staying discoverable.",
      "Designed to reduce missed opportunities caused by outdated materials.",
    ],
    ctaPrimary: { label: "Join the beta", href: "/signup" },
    ctaSecondary: {
      label: "Search talent",
      href: "/search",
    },
    faq: [
      {
        question: "Do I need representation to join?",
        answer:
          "No. Motiion supports represented and independent dancers, so you can manage opportunities in the way that fits your career.",
      },
      {
        question: "Can I update my profile as I book new work?",
        answer:
          "Yes. Profiles are designed to stay current as your credits, reels, and availability evolve.",
      },
    ],
  },
  choreographers: {
    key: "choreographers",
    label: "Choreographers",
    selectorLabel: "Choreographers",
    headline: "Discover and shortlist talent with less friction.",
    summary:
      "Motiion centralizes dancer discovery so choreographers can move from search to casting decisions quickly.",
    valueStatement:
      "A practical system for finding, evaluating, and progressing the right talent under real timelines.",
    benefits: [
      "Filter by style, experience, and availability in one place.",
      "Review verified profiles and reels without jumping between tools.",
      "Save and compare candidates in reusable shortlists.",
      "Move from discovery to outreach with fewer handoffs.",
    ],
    workflowSteps: [
      "Define role needs and creative constraints.",
      "Search and compare profiles with structured information.",
      "Save and share shortlists with collaborators.",
      "Advance outreach and decisions from one workflow.",
    ],
    trustPoints: [
      "Profile structure supports fast decision-making.",
      "Built for high-speed production timelines.",
      "Reduces search fatigue and fragmented review loops.",
    ],
    ctaPrimary: { label: "Join the beta", href: "/signup" },
    ctaSecondary: { label: "Browse profiles", href: "/search" },
    faq: [
      {
        question: "Is Motiion free for choreographers?",
        answer:
          "Yes. Core discovery and profile capabilities are available during early onboarding.",
      },
      {
        question: "Can I search by specific style and experience criteria?",
        answer:
          "Yes. Motiion is designed around practical filtering that reflects real casting needs.",
      },
    ],
  },
  talentAgents: {
    key: "talentAgents",
    label: "Talent Agents",
    selectorLabel: "Talent Agents",
    headline: "Keep rosters presentation-ready and easier to activate.",
    summary:
      "Motiion helps talent agencies maintain accurate, up-to-date artist profiles for faster matching and stronger client response.",
    valueStatement:
      "A centralized roster layer that replaces fragmented docs, outdated links, and repeated manual updates.",
    benefits: [
      "Maintain current talent profiles in a single searchable system.",
      "Reduce manual portfolio upkeep across disconnected tools.",
      "Respond to briefs faster with clearer roster visibility.",
      "Improve consistency and speed across client-facing submissions.",
    ],
    workflowSteps: [
      "Organize represented talent into structured profiles.",
      "Keep media, credits, and availability synced.",
      "Match roster options to incoming briefs quickly.",
      "Share polished talent options with confidence.",
    ],
    trustPoints: [
      "Designed for high-volume roster operations.",
      "Reduces risk from stale profile versions.",
      "Improves response speed without sacrificing quality.",
    ],
    ctaPrimary: { label: "Join the beta", href: "/signup" },
    ctaSecondary: { label: "Contact the team", href: "mailto:hello@motiion.com" },
    faq: [
      {
        question: "Can agencies manage full rosters in Motiion?",
        answer:
          "Yes. The workflow is designed to support roster-scale organization and rapid client response.",
      },
      {
        question: "Do we need to replace everything at once?",
        answer:
          "No. Teams can adopt Motiion incrementally and centralize the highest-friction workflows first.",
      },
    ],
  },
  castingReps: {
    key: "castingReps",
    label: "Casting Reps",
    selectorLabel: "Casting Reps",
    headline: "Move from brief to shortlist with greater clarity.",
    summary:
      "Motiion gives casting teams a more reliable workflow for discovering, evaluating, and advancing talent decisions.",
    valueStatement:
      "A focused casting operating layer that reduces search time and accelerates decisions.",
    benefits: [
      "Search by style, experience, location, and availability from one source.",
      "Review verified profiles with less back-and-forth.",
      "Build and share shortlists faster across stakeholders.",
      "Spend more time on creative fit and less on admin cleanup.",
    ],
    workflowSteps: [
      "Define project requirements and constraints.",
      "Run targeted search across verified profiles.",
      "Assemble and share shortlists for review.",
      "Advance to confirmation with clearer context.",
    ],
    trustPoints: [
      "Built for fast-moving, high-volume casting cycles.",
      "Improves consistency across reviewer decisions.",
      "Reduces time-to-shortlist while preserving quality.",
    ],
    ctaPrimary: { label: "Join the beta", href: "/signup" },
    ctaSecondary: { label: "Search talent", href: "/search" },
    faq: [
      {
        question: "Is Motiion a talent agency?",
        answer:
          "No. Motiion is a platform that supports discovery and casting workflow execution.",
      },
      {
        question: "Can this work across different project types?",
        answer:
          "Yes. The search and shortlist workflow is designed to support multiple production contexts.",
      },
    ],
  },
};

export const sharedFaqItems: FaqItem[] = [
  {
    question: "What is Motiion?",
    answer:
      "Motiion is a talent platform for the dance industry connecting dancers, choreographers, and creative teams through verified profiles and streamlined discovery.",
  },
  {
    question: "When does Motiion launch?",
    answer:
      "Motiion is onboarding its first wave of users now. Join the beta to get early access and launch updates.",
  },
  {
    question: "What does Motiion improve first?",
    answer:
      "The first focus is reducing discovery friction, keeping profile data current, and helping teams make faster talent decisions with clearer context.",
  },
];

export const socialMetrics = [
  { label: "Profiles represented", value: "4k+" },
  { label: "Creative teams onboarded", value: "300+" },
  { label: "Avg. faster shortlist decisions", value: "34%" },
];

export const socialProofQuotes = [
  {
    quote:
      "The role filters and verified reels cut our first pass review time dramatically. We can stay in creative mode longer.",
    source: "Casting Producer, Commercial Studio",
  },
  {
    quote:
      "Our roster finally lives in one place that is clean enough to share and flexible enough for daily updates.",
    source: "Talent Agent, Los Angeles",
  },
];
