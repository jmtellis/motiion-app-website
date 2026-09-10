import { LegalPageShell } from "@/components/landing/LegalPageShell";
import { legalMarketingViewport, type LegalPageSection } from "@/lib/marketing/legal-page";

export const viewport = legalMarketingViewport;

const termsSections: LegalPageSection[] = [
  {
    title: "General terms",
    paragraphs: [
      "By accessing or using Motiion, you agree to be bound by these Terms & Conditions.",
      "To the maximum extent permitted by law, Motiion is not liable for direct, indirect, incidental, special, or consequential damages resulting from use of the service.",
      "Motiion may change pricing and usage policies at any time.",
    ],
  },
  {
    title: "License",
    paragraphs: [
      "Motiion grants you a revocable, non-exclusive, non-transferable, limited license to use the website/app in accordance with this agreement.",
    ],
  },
  {
    title: "User content",
    paragraphs: [
      "You retain ownership of photos, videos, headshots, profile media, and other content you upload to Motiion (\"User Content\").",
      "By uploading User Content or creating an account, you grant Motiion a worldwide, royalty-free, non-exclusive, sublicensable license to host, store, display, reproduce, adapt, and distribute your User Content as needed to operate and improve the service, including public profiles, search, discovery, casting, and related features.",
      "You also grant Motiion the right to use your name, likeness, profile information, and User Content in Motiion's own promotional materials, including the Motiion website, Motiion emails, and Motiion social media accounts, without compensation to you.",
      "This promotional license does not apply to private messages, invite-only materials, or unpublished drafts.",
      "You represent that you own your User Content or have permission to grant these rights, and that any person depicted has consented where required. This license does not authorize Motiion to use third-party copyrighted materials (such as credit posters or logos you do not own) beyond what is needed to operate the service.",
      "You may opt out of promotional use of your name, likeness, or User Content by contacting us. Opting out does not remove content from the product (for example, public profiles or search) and does not require Motiion to recall, delete, or alter ads, posts, or materials already published or distributed.",
      "If you are under 18, Motiion will not use your photos or likeness in promotional materials based solely on these Terms without appropriate parent or guardian consent.",
    ],
  },
  {
    title: "Definitions and key terms",
    bullets: [
      "Company: Motiion Ventures Inc. (11120 Chandler Blvd Apt 4098, North Hollywood, CA 91601).",
      "Country: United States.",
      "Device: any internet-connected device used to access Motiion.",
      "Service: services provided through the Motiion platform.",
      "Third-party service: external advertisers, partners, or providers.",
      "You: person or entity using the services.",
      "Cookie: small browser-stored data for analytics and preference handling.",
    ],
  },
  {
    title: "Restrictions",
    bullets: [
      "Do not license, sell, rent, lease, assign, distribute, transmit, host, outsource, or otherwise commercially exploit the platform.",
      "Do not modify, create derivative works, decrypt, reverse engineer, or disassemble any part of the website/app.",
      "Do not remove or alter proprietary notices.",
    ],
  },
  {
    title: "Return and refund policy",
    paragraphs: [
      "Purchases are subject to applicable transaction terms. If you are not satisfied with goods or services provided by Motiion, contact us to discuss resolution options.",
    ],
  },
  {
    title: "Your suggestions",
    paragraphs: [
      "Feedback, ideas, and suggestions you provide regarding the platform become the sole property of Motiion, and may be used without compensation or attribution.",
    ],
  },
  {
    title: "Consent",
    paragraphs: [
      "By using the website/app, registering an account, or making a purchase, you consent to these Terms & Conditions.",
    ],
  },
  {
    title: "Links to other websites",
    paragraphs: [
      "These Terms apply only to Motiion services. Linked third-party websites are governed by their own policies and terms.",
    ],
  },
  {
    title: "Cookies",
    paragraphs: [
      "Motiion uses cookies to improve platform functionality and experience. Disabling cookies may limit certain features.",
    ],
  },
  {
    title: "Changes, modifications, and updates",
    paragraphs: [
      "Motiion may change these Terms, modify the website/app, suspend features, or discontinue services at its discretion.",
      "Updates, patches, and upgrades may be released at any time and are considered part of the service.",
    ],
  },
  {
    title: "Third-party services",
    paragraphs: [
      "Motiion may include third-party content or links. Motiion is not responsible for the accuracy, legality, quality, or reliability of third-party services.",
    ],
  },
  {
    title: "Term and termination",
    paragraphs: [
      "This agreement remains in effect until terminated by you or Motiion. Motiion may suspend or terminate access at any time, with or without notice, including for violations of these terms.",
    ],
  },
  {
    title: "Copyright infringement notice",
    paragraphs: [
      "If you believe material on the platform infringes your copyright, contact us with a valid notice including identification of the content, contact details, and a statement of authority.",
    ],
  },
  {
    title: "Indemnification",
    paragraphs: [
      "You agree to indemnify and hold harmless Motiion and its affiliates, officers, employees, and partners from claims arising from your use of the service, violation of law, or violation of third-party rights.",
    ],
  },
  {
    title: "No warranties",
    paragraphs: [
      "The website/app is provided on an \"AS IS\" and \"AS AVAILABLE\" basis, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement.",
    ],
  },
  {
    title: "Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by law, Motiion and its suppliers are not liable for special, incidental, indirect, or consequential damages, including lost profits, loss of data, business interruption, or privacy-related harms.",
    ],
  },
  {
    title: "Severability and waiver",
    paragraphs: [
      "If any provision is unenforceable, the remainder remains in effect. Failure to enforce any right is not a waiver of that right.",
    ],
  },
  {
    title: "Amendments and entire agreement",
    paragraphs: [
      "Motiion may amend this agreement at its discretion. Continued use after changes become effective constitutes acceptance of revised terms.",
      "These Terms, together with the Privacy Policy and legal notices, form the entire agreement between you and Motiion regarding service use.",
    ],
  },
  {
    title: "Intellectual property",
    paragraphs: [
      "All platform content, design, and functionality are owned by Motiion or its licensors and are protected by intellectual property laws.",
      "Unauthorized copying, distribution, or modification is prohibited unless expressly permitted in writing.",
    ],
  },
  {
    title: "Dispute resolution and arbitration",
    paragraphs: [
      "Before arbitration, parties will attempt informal resolution through a written Notice of Dispute.",
      "Unresolved disputes are subject to binding arbitration under applicable American Arbitration Association rules, except where injunctive or equitable relief for intellectual property rights is sought.",
    ],
  },
  {
    title: "Submissions, promotions, and typographical errors",
    paragraphs: [
      "Ideas or materials submitted to Motiion may be treated as non-confidential and non-proprietary.",
      "Promotions may have separate eligibility rules.",
      "Motiion may cancel orders caused by pricing or informational typographical errors and issue appropriate refunds.",
    ],
  },
  {
    title: "Miscellaneous and disclaimer",
    paragraphs: [
      "If any term is found unenforceable, remaining terms remain effective.",
      "Motiion is not responsible for content inaccuracies and may update service content at any time without notice.",
      "The service is provided without guarantees of uninterrupted, secure, or error-free operation.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms & Conditions"
      updatedAt="Updated at August 15th, 2026"
      intro="These Terms & Conditions govern your use of Motiion services, including our website and related applications. By using the service, you agree to these terms."
      sections={termsSections}
      contactIntro="If you have questions about these Terms, contact us:"
    />
  );
}
