type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeaderProps) {
  const alignmentClass = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <header className={`max-w-2xl ${alignmentClass}`}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-balance text-3xl leading-tight font-semibold tracking-tight text-[var(--ink)] md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-pretty text-base leading-relaxed text-[var(--ink-soft)] md:text-lg">
          {description}
        </p>
      ) : null}
    </header>
  );
}
