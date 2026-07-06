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

export type EditorialPart =
  | string
  | { text: string; emphasis?: boolean; accent?: boolean };

export type StudioTransitionBeat = {
  eyebrow: string;
  headlineParts: EditorialPart[];
  image: { src: string; alt: string };
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

/** Brand statement band after the solution pillars. */
export const homeBrandStatementSection = {
  headlineParts: [
    "Motiion is the operating system for creative careers.",
  ] as EditorialPart[],
};

export const iosHeroCta = {
  label: "Download for iOS",
  modal: {
    title: "iOS app coming soon",
    description:
      "The Motiion mobile app is on the way. Join our beta to get early access, test new features, and help shape the experience before launch.",
    betaCta: { label: "Join Beta", href: "#signup" },
    dismissLabel: "Not now",
  },
} as const;

export const learnMoreHeroCta = {
  label: "Learn More",
  modal: {
    title: "What brings you to Motiion?",
    description: "Choose the path that fits you and we'll take you to the right overview.",
    paths: [
      {
        id: "talent",
        label: "Talent",
        description: "Create a profile. Get discovered. Book work.",
        href: "/for-talent",
      },
      {
        id: "casting",
        label: "Industry Professional",
        description: "Discover talent. Build rosters. Create castings. Manage projects.",
        href: "/for-casting",
      },
    ],
  },
} as const;

export const homeHero = {
  headline: {
    parts: [
      "The platform designed to keep the industry in ",
      { text: "Motiion", emphasis: true, accent: true },
      ".",
    ] as EditorialPart[],
  },
  subtext: "Reshaping how professional dancers are discovered, booked, and managed.",
  pillars: [
    {
      title: "Discover smarter",
      titleParts: [
        { text: "Discover", emphasis: true },
        " smarter",
      ] as EditorialPart[],
      description: "Auditions, castings, and gigs in one unified stream.",
      image: {
        src: "/images/pillars/discover-smarter.png",
        alt: "Two dancers in silhouette against a warm orange backdrop",
      },
    },
    {
      title: "Verify instantly",
      titleParts: [
        { text: "Verify", emphasis: true },
        " instantly",
      ] as EditorialPart[],
      description: "Headshots, sizing, and credits kept current in one profile.",
      image: {
        src: "/images/pillars/verify-instantly.png",
        alt: "Dancer in a dynamic pose against a white studio background",
      },
    },
    {
      title: "Decide faster",
      titleParts: [
        { text: "Decide", emphasis: true },
        " faster",
      ] as EditorialPart[],
      description: "Collaborate on shortlists and lock casting in one place.",
      image: {
        src: "/images/pillars/decide-faster.png",
        alt: "Dancer in black velvet on a terracotta studio set",
      },
    },
  ],
  audienceLinks: [
    {
      id: "talent",
      label: "Talent",
      href: "/for-talent",
    },
    {
      id: "casting",
      label: "Industry Professional",
      href: "/for-casting",
    },
  ],
};

/** Outline scroll marquees — anchored to the bottom of the brand statement section. */
export const landingMarquees = {
  belowHero: {
    segments: ["Discover", "Motiion", "Talent", "Database"],
    direction: "right" as const,
  },
  belowBrandStatement: {
    segments: ["Creatives", "Management", "Labels", "Agents", "Casting", "Production"],
    direction: "left" as const,
  },
} as const;

export const homePillarsSection = {
  title: "A workflow more creative than ever.",
} as const;

export const homeSignupScrollCta = {
  label: "Sign up",
} as const;

export const homeSignupSection = {
  eyebrow: "Get started",
  title: "Join Motiion.",
  description: "Create a talent profile or set up an industry workspace.",
  paths: [
    {
      id: "talent",
      label: "Creative Talent",
      description: "For dancers and choreographers building a profile and managing their career.",
      href: "/signup",
      cta: "Sign up as talent",
    },
    {
      id: "industry",
      label: "Industry Professional",
      description: "For casting teams, agencies, and producers discovering and managing talent.",
      href: "/talent-buyers/signup",
      cta: "Sign up as industry",
    },
  ],
} as const;

export const studioTransitionSection = {
  beats: [
    {
      eyebrow: "Behind the scenes",
      headlineParts: [
        { text: "Behind the scenes", emphasis: true },
        " on dance floors ",
        { text: "worldwide", emphasis: true, accent: true },
      ],
      image: {
        src: "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?auto=format&fit=crop&w=1600&q=80",
        alt: "Dancers rehearsing behind the scenes in a studio",
      },
    },
    {
      eyebrow: "Trusted worldwide",
      headlineParts: [
        "We've built for ",
        { text: "choreographers", emphasis: true },
        ", ",
        { text: "casting teams", emphasis: true },
        ", and ",
        { text: "agents", emphasis: true, accent: true },
        " worldwide",
      ],
      image: {
        src: "https://images.unsplash.com/photo-1547153524-96ad3811a5f0?auto=format&fit=crop&w=1600&q=80",
        alt: "International dance performance on stage",
      },
    },
  ] satisfies StudioTransitionBeat[],
};

export const productProofStrip = {
  eyebrow: "Inside Motiion",
  title: "Search, profile, and confirm — in one flow.",
  screens: [
    {
      src: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80",
      alt: "Discover talent placeholder",
      label: "Search talent",
    },
    {
      src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
      alt: "Verified profile placeholder",
      label: "Verified profile",
    },
    {
      src: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=900&q=80",
      alt: "Booking flow placeholder",
      label: "Book & confirm",
    },
  ],
};

export const homepageIntro = {
  eyebrow: "The creative operating system",
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
  headline: "We simplified the chaos and put it into Motiion",
  pillars: homeHero.pillars.map(({ title, description }) => ({ title, description })) as NarrativePillar[],
  summary: homeHero.subtext,
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
    label: "Talent",
    description: "Create a profile. Get discovered. Book work.",
    href: "/for-talent",
  },
  {
    label: "Industry Professional",
    description: "Discover talent. Build rosters. Create castings. Manage projects.",
    href: "/for-casting",
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
