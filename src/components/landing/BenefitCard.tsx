type BenefitCardProps = {
  title: string;
  description: string;
};

export function BenefitCard({ title, description }: BenefitCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white p-5 transition-colors duration-300 hover:border-[var(--accent)]/40">
      <h3 className="text-base font-semibold tracking-tight text-[var(--ink)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
        {description}
      </p>
    </article>
  );
}
