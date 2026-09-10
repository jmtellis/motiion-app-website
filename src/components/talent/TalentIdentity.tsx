import Image from "next/image";

export function TalentIdentity({
  name,
  username,
  headshotUrl,
  size = "md",
  subtitle,
}: {
  name: string;
  username?: string | null;
  headshotUrl?: string | null;
  size?: "sm" | "md" | "lg";
  subtitle?: string | null;
}) {
  const dim = size === "sm" ? 40 : size === "lg" ? 96 : 64;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative shrink-0 overflow-hidden rounded-[var(--ds-radius-card)] border border-[var(--ds-border)] bg-[var(--ds-surface-raised)]"
        style={{ width: dim, height: dim }}
      >
        {headshotUrl ? (
          <Image src={headshotUrl} alt="" fill className="object-cover" unoptimized />
        ) : (
          <span className="flex size-full items-center justify-center text-sm font-semibold text-[var(--ds-muted)]">
            {initials || "·"}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold tracking-[-0.02em] text-[var(--ds-text-default)]">
          {name}
        </p>
        {username || subtitle ? (
          <p className="mt-0.5 truncate text-sm text-[var(--ds-muted)]">
            {[username ? `@${username}` : null, subtitle].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
