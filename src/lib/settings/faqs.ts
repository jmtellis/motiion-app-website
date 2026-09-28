export type SettingsFaq = {
  id: string;
  question: string;
  answer: string;
};

export type SettingsFaqSection = {
  id: string;
  title: string;
  items: SettingsFaq[];
};

/** Same catalog as the app’s Settings → FAQs. */
export const settingsFaqSections: SettingsFaqSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    items: [
      {
        id: "what-is-motiion",
        question: "What is Motiion?",
        answer:
          "Motiion is a platform for the professional dance industry. Talent builds a discoverable portfolio and applies to opportunities. Industry professionals search talent, manage rosters, and run castings and projects. Community members can follow the scene without a public talent profile.",
      },
      {
        id: "need-representation",
        question: "Do I need representation to join?",
        answer:
          "No. Motiion supports both represented and independent talent. You can manage your profile and opportunities however your career works.",
      },
      {
        id: "is-talent-agency",
        question: "Is Motiion a talent agency?",
        answer:
          "No. Motiion is infrastructure for discovery, castings, rosters, and projects. We do not represent talent.",
      },
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    items: [
      {
        id: "add-shell",
        question: "How do I add an Industry Professional or Talent account?",
        answer:
          "Open the account menu at the bottom of the sidebar. If you only have one profile type, choose Add profile, enter the industry access password when asked, then finish the short setup. Your login, calendar, and messages stay on the same account. Community accounts cannot add a second profile type.",
      },
      {
        id: "switch-shell",
        question: "How do I switch between Talent and Industry Professional?",
        answer:
          "Open the account menu at the bottom of the sidebar, then choose which Motiion experience to open. Your calendar and identity stay the same.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy",
    items: [
      {
        id: "private-account",
        question: "How do I make my profile private?",
        answer:
          "Go to Settings → Account and turn on Private account. Private profiles are hidden from search. You may still appear on rosters for classes or sessions you share with others.",
      },
    ],
  },
  {
    id: "castings-work",
    title: "Castings & work",
    items: [
      {
        id: "apply-casting",
        question: "How do I apply to a casting?",
        answer:
          "Open Motiion on your Talent profile. Find a casting from Home or Discover, open it, and submit. Free plans include a limited number of lifetime submissions; Pro removes that limit.",
      },
      {
        id: "post-casting",
        question: "How do I post a casting or manage a roster?",
        answer:
          "Use your Industry Professional profile, or add one from the account menu. From there you can create projects, publish castings with roles, and manage rosters.",
      },
    ],
  },
  {
    id: "billing",
    title: "Billing",
    items: [
      {
        id: "subscriptions",
        question: "How do subscriptions work?",
        answer:
          "Open Settings → Privacy & support → Subscription to see your current plan. Motiion offers Talent Pro, Industry Pro, Dual (talent + industry), and Community Pro. Plan details and pricing are shown with the subscription.",
      },
      {
        id: "stripe-connect",
        question: "How do I get paid for classes or events?",
        answer:
          "Connect payouts in Settings → Verification → Stripe Connect. Once set up, payouts for eligible classes and events can go to your connected account.",
      },
    ],
  },
  {
    id: "support",
    title: "Support",
    items: [
      {
        id: "contact-support",
        question: "How do I contact support?",
        answer:
          "Go to Settings → Privacy & support → Support, or email support@motiion.io. We typically reply as soon as we can.",
      },
    ],
  },
];
