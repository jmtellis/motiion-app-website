import Link from "next/link";

const privacySections = [
  {
    title: "Definitions and key terms",
    paragraphs: [
      "To help explain this Privacy Policy as clearly as possible, these terms are used with specific meanings.",
    ],
    bullets: [
      "Cookie: small data created by a website and saved by your browser to identify your browser, provide analytics, and remember preferences.",
      "Company: Motiion Ventures Inc. (11120 Chandler Blvd Apt 4098, North Hollywood, CA 91601).",
      "Country: United States.",
      "Customer: a company, organization, or person that signs up to use Motiion.",
      "Device: any internet-connected device used to access Motiion.",
      "IP address: a number assigned to an internet-connected device, often usable for general location estimation.",
      "Personnel: individuals employed by or contracted by Motiion.",
      "Personal Data: information that can directly or indirectly identify a person.",
      "Service: the services provided by Motiion.",
      "Third-party service: advertisers, partners, or other external providers.",
      "Website: www.motiion.io.",
      "You: a person or entity registered to use Motiion services.",
    ],
  },
  {
    title: "What information we collect",
    paragraphs: [
      "We collect information when you visit our website, register, subscribe, respond to a survey, or fill out a form.",
    ],
    bullets: [
      "Name / Username",
      "Phone number",
      "Email address",
      "Age",
      "Password",
    ],
  },
  {
    title: "Optional mobile permissions",
    paragraphs: [
      "For certain features, the app may request optional mobile permissions.",
    ],
    bullets: [
      "Location (GPS): used to improve relevance of content and advertising.",
      "Contacts: used to make contact-based workflows easier.",
      "Camera: used to upload photos directly.",
      "Photo gallery: used to upload photos from your device.",
    ],
  },
  {
    title: "Information from third parties",
    paragraphs: [
      "Motiion may receive information from third parties, including publicly available social media information and fraud-detection providers, when needed to provide services.",
    ],
  },
  {
    title: "How we share information",
    paragraphs: [
      "We may share personal and non-personal information with service providers, affiliates, analytics providers, advertisers, and business partners as needed to operate and improve the service.",
      "We may also disclose information to comply with legal obligations, protect rights and safety, prevent illegal activity, or support corporate transactions such as mergers, acquisitions, or asset sales.",
    ],
  },
  {
    title: "How we use information",
    bullets: [
      "Personalize your experience.",
      "Improve our website and offerings.",
      "Improve customer service and support.",
      "Process transactions.",
      "Administer promotions, surveys, and site features.",
      "Send periodic emails and service communications.",
    ],
  },
  {
    title: "Email communications",
    paragraphs: [
      "By submitting your email, you may receive communications from us. You can opt out through unsubscribe options included in those communications.",
      "We do not send unsolicited commercial email. Email addresses may also be used for audience targeting where users have opted in to communications.",
    ],
  },
  {
    title: "Data retention",
    paragraphs: [
      "We keep personal information only as long as needed to provide services and satisfy legal or regulatory requirements, then remove or de-identify it where feasible.",
    ],
  },
  {
    title: "Security",
    paragraphs: [
      "We use administrative, technical, and physical safeguards, including secure transmission practices, to protect personal information.",
      "No system is completely secure, and we cannot guarantee absolute security.",
    ],
  },
  {
    title: "International transfers",
    paragraphs: [
      "Information may be transferred to and processed in countries where privacy laws may differ. By using the service, you consent to these transfers where permitted by law.",
    ],
  },
  {
    title: "Access, updates, and deletion",
    paragraphs: [
      "Depending on your relationship with Motiion and applicable law, you may request access, corrections, communication preference changes, or deletion of personal data.",
      "Some residual data may persist in backups or archival systems for technical and legal reasons.",
    ],
  },
  {
    title: "Personnel information",
    paragraphs: [
      "If you are a worker or applicant, information you provide may be used for HR and recruiting purposes, including benefits administration and applicant review.",
    ],
  },
  {
    title: "Affiliates and business transfers",
    paragraphs: [
      "Information may be shared with corporate affiliates and may be transferred as part of a merger, sale, reorganization, or similar transaction, subject to this policy.",
    ],
  },
  {
    title: "Governing law",
    paragraphs: [
      "This Privacy Policy is governed by United States law, without regard to conflict-of-laws rules, subject to any rights you may have under applicable privacy frameworks.",
    ],
  },
  {
    title: "Cookies and tracking technologies",
    paragraphs: [
      "We use cookies and related technologies to improve performance and functionality and to support analytics and advertising.",
      "You can block cookies in your browser settings, but some service functionality may be limited.",
    ],
    bullets: [
      "Google Maps API",
      "Cookies",
      "Local Storage",
      "Sessions",
    ],
  },
  {
    title: "Children's privacy",
    paragraphs: [
      "Our services are not directed to children under 13, and we do not knowingly collect personal data from children under 13 without required consent.",
    ],
  },
  {
    title: "GDPR and regional rights",
    paragraphs: [
      "For individuals in the EEA and other jurisdictions, we support applicable data rights, including access, correction, deletion, restriction, and portability where required by law.",
      "California residents may have rights under CCPA and CalOPPA, including rights to know, access, and request deletion of personal information.",
      "We do not sell the personal information of our users.",
    ],
  },
  {
    title: "Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy to reflect service or legal changes. Continued use of the service after updates take effect indicates acceptance of the updated policy.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--paper)]">
      <div className="mx-auto w-full max-w-4xl px-6 py-12 lg:px-10 lg:py-16">
        <Link
          href="/"
          className="text-sm font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)]"
        >
          Back to home
        </Link>

        <header className="mt-6 border-b border-[var(--line)] pb-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--accent)] uppercase">
            Legal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-[var(--ink-soft)]">
            Updated at February 3rd, 2026
          </p>
          <p className="mt-5 text-base leading-relaxed text-[var(--ink-soft)]">
            Motiion (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This
            policy explains how personal information is collected, used, and
            disclosed when you use our website, related subdomains, and
            application services.
          </p>
        </header>

        <div className="mt-10 space-y-8">
          {privacySections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
                {section.title}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm leading-relaxed text-[var(--ink-soft)] sm:text-base"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--ink-soft)] sm:text-base">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <section className="mt-12 border-t border-[var(--line)] pt-8">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--ink)]">
            Contact us
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)] sm:text-base">
            If you have questions about this Privacy Policy, contact us:
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--ink-soft)] sm:text-base">
            <li>Via email: info@motiion.io</li>
            <li>
              Via link:{" "}
              <a
                href="https://www.motiion.io/contact"
                className="underline decoration-[var(--line)] underline-offset-4 transition-colors hover:text-[var(--ink)]"
              >
                www.motiion.io/contact
              </a>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
