import type { ReactNode } from "react";

export type EditorialPart =
  | string
  | { text: string; emphasis?: boolean; accent?: boolean };

type EditorialHeadlineProps = {
  parts: EditorialPart[];
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  size?: "display-xl" | "display" | "heading-1";
  dark?: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function renderPart(part: EditorialPart, index: number): ReactNode {
  if (typeof part === "string") {
    return <span key={index}>{part}</span>;
  }
  if (part.emphasis) {
    return (
      <strong key={index} className={part.accent ? "type-emphasis-accent" : "type-emphasis"}>
        {part.text}
      </strong>
    );
  }
  return <span key={index}>{part.text}</span>;
}

/** Editorial headline with mixed regular + bold emphasis spans. */
export function EditorialHeadline({
  parts,
  as: Tag = "h2",
  className,
  size = "heading-1",
  dark = false,
}: EditorialHeadlineProps) {
  const sizeClass =
    size === "display-xl"
      ? "type-display-xl"
      : size === "display"
        ? "type-display"
        : "type-heading-1";

  return (
    <Tag
      className={cn(
        "type-editorial text-balance",
        sizeClass,
        dark ? "text-on-dark-primary" : "text-[var(--ink)]",
        className,
      )}
    >
      {parts.map(renderPart)}
    </Tag>
  );
}
