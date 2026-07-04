type FeatureCardProps = {
  title: string;
  description: string;
};

export function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <article className="ui-card-interactive group p-5">
      <h3 className="text-lg font-semibold tracking-tight text-[var(--ink)]">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
        {description}
      </p>
    </article>
  );
}
