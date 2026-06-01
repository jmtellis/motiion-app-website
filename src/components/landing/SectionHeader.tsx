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
        <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-[var(--accent)] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <TitleTag
        className={`text-balance text-3xl leading-tight font-semibold tracking-tight md:text-4xl lg:text-[2.75rem] ${dark ? "text-white" : "text-[var(--ink)]"}`}
      >
        {title}
      </TitleTag>
      {description ? (
        <p
          className={`mt-5 text-pretty text-base leading-relaxed md:text-lg ${dark ? "text-white/65" : "text-[var(--ink-soft)]"}`}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}
