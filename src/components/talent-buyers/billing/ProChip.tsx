"use client";

/** Compact Pro label for segmented controls — accent text only, no chip chrome. */
export function ProChip({
  className = "",
  tone = "accent",
}: {
  className?: string;
  /** On white active segments use darker accent; otherwise bright accent. */
  tone?: "accent" | "on-active";
}) {
  return (
    <span
      className={`pro-chip pro-chip--${tone}${className ? ` ${className}` : ""}`}
      aria-label="Industry Pro"
    >
      Pro
    </span>
  );
}
