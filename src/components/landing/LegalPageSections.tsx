import type { LegalPageSection } from "@/lib/marketing/legal-page";

export function LegalPageSections({
  sections,
  contactIntro,
}: {
  sections: LegalPageSection[];
  contactIntro: string;
}) {
  return (
    <div className="legal-page-content mx-auto w-full max-w-4xl px-6 pb-16 lg:px-10 lg:pb-20">
      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-[#fafafa]">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p
                key={paragraph}
                className="text-sm leading-relaxed text-[#a3a3a3] sm:text-base"
              >
                {paragraph}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 ? (
              <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#a3a3a3] sm:text-base">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <section className="mt-12 border-t border-[#262626] pt-8">
        <h2 className="text-xl font-semibold tracking-tight text-[#fafafa]">Contact us</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#a3a3a3] sm:text-base">{contactIntro}</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#a3a3a3] sm:text-base">
          <li>Via email: info@motiion.io</li>
          <li>
            Via link:{" "}
            <a
              href="https://www.motiion.io/contact"
              className="underline decoration-[#3a3a3a] underline-offset-4 transition-colors hover:text-[#fafafa]"
            >
              www.motiion.io/contact
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
