type FeatureCardProps = {
  title: string;
  description: string;
};

export function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <article className="group rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
      <h3 className="text-lg font-semibold tracking-tight text-[var(--ink)]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
        {description}
      </p>
    </article>
  );
}
