import { LegalPageShell } from "@/components/landing/LegalPageShell";
import { legalMarketingViewport, type LegalPageSection } from "@/lib/marketing/legal-page";

export const viewport = legalMarketingViewport;

const cookieSections: LegalPageSection[] = [
  {
    title: "Introduction",
    paragraphs: [
      "This Cookie Policy explains how Motiion Ventures Inc. (\"Motiion,\" \"we,\" \"us,\" or \"our\") uses cookies and similar technologies on www.motiion.io and related applications.",
      "We operate primarily in California and design our practices with California privacy laws in mind, including the California Consumer Privacy Act (CCPA) as amended by the California Privacy Rights Act (CPRA).",
      "This policy should be read together with our Privacy Policy and Terms of Service.",
    ],
  },
  {
    title: "What are cookies and similar technologies?",
    paragraphs: [
      "Cookies are small text files stored on your browser or device when you visit a website. Similar technologies include local storage, session storage, pixels, and SDK identifiers used in mobile apps.",
      "These technologies help websites function, remember preferences, understand usage, and improve security.",
    ],
  },
  {
    title: "How we use cookies",
    bullets: [
      "Essential cookies: required for core site functionality such as authentication, security, load balancing, and fraud prevention.",
      "Functional cookies: remember preferences such as language, region, and interface settings.",
      "Analytics cookies: help us understand how visitors use Motiion so we can improve performance and product experience.",
      "Marketing cookies (if enabled): may be used to measure campaign effectiveness and deliver more relevant messaging.",
    ],
  },
  {
    title: "Cookie categories we may use",
    bullets: [
      "Strictly necessary: enable login sessions, account security, and basic navigation.",
      "Performance and analytics: collect aggregated usage data such as pages visited, feature interactions, and error events.",
      "Preference: store settings you choose to personalize your experience.",
      "Third-party service cookies: set by providers that help us operate the platform (for example hosting, analytics, payment, or communication tools).",
    ],
  },
  {
    title: "Third-party cookies",
    paragraphs: [
      "Some cookies are placed by service providers acting on our behalf. These providers may process information according to their own privacy policies.",
      "We limit third-party tools to what is reasonably necessary to operate, secure, and improve Motiion.",
    ],
  },
  {
    title: "Your choices and browser controls",
    bullets: [
      "You can control cookies through your browser settings, including blocking or deleting cookies.",
      "You can clear existing cookies from your browser at any time.",
      "If you disable essential cookies, some parts of Motiion may not function correctly.",
      "Where available, you may also manage optional analytics or marketing cookies through in-product privacy controls.",
    ],
  },
  {
    title: "California privacy rights",
    paragraphs: [
      "If you are a California resident, you may have rights to know, access, correct, and delete certain personal information, and to opt out of the sale or sharing of personal information, subject to legal exceptions.",
      "Motiion does not sell personal information for money. We also do not share personal information for cross-context behavioral advertising in exchange for monetary or other valuable consideration.",
      "You may submit a privacy request by contacting us using the details below. We will verify requests as required by law and will not discriminate against you for exercising your privacy rights.",
    ],
  },
  {
    title: "Do Not Sell or Share",
    paragraphs: [
      "Because Motiion does not sell or share personal information as defined under California law, a separate \"Do Not Sell or Share My Personal Information\" link is not required for our current practices.",
      "If our practices change, we will update this policy and provide any legally required notice or controls.",
    ],
  },
  {
    title: "Updates to this policy",
    paragraphs: [
      "We may update this Cookie Policy from time to time to reflect changes in technology, law, or our services. The \"Last updated\" date at the top of this page indicates when this policy was most recently revised.",
      "Continued use of Motiion after updates become effective constitutes acceptance of the revised policy.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      updatedAt="Last updated: July 6, 2026"
      intro="This policy explains how Motiion uses cookies and similar technologies, and how California residents can exercise related privacy choices."
      sections={cookieSections}
      contactIntro="If you have questions about this Cookie Policy or want to submit a California privacy request, contact us:"
    />
  );
}
