type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  titleAs?: "h1" | "h2";
  dark?: boolean;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  titleAs = "h2",
  dark = false,
}: SectionHeaderProps) {
  const alignmentClass = align === "center" ? "text-center mx-auto" : "text-left";
  const TitleTag = titleAs;

  return (
    <header className={`max-w-2xl ${alignmentClass}`}>
      {eyebrow ? (
        <p className="type-eyebrow mb-3 text-[var(--accent)]">{eyebrow}</p>
      ) : null}
      <TitleTag
        className={`type-heading-1 text-balance ${dark ? "text-on-dark-primary" : "text-[var(--ink)]"}`}
      >
        {title}
      </TitleTag>
      {description ? (
        <p
          className={`type-lead mt-5 max-w-prose text-pretty ${dark ? "text-on-dark-secondary" : "text-[var(--ink-soft)]"}`}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}
