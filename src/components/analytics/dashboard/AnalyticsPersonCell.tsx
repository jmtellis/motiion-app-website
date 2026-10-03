import Link from "next/link";

import { getProfileInitials } from "@/lib/auth/avatar";
import type { PersonIdentity } from "@/lib/analytics/person-identity";

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--line)] text-xs font-semibold text-[var(--ink)]">
      {getProfileInitials(name)}
    </div>
  );
}

export function AnalyticsPersonCell({
  person,
  href,
}: {
  person: PersonIdentity;
  href?: string | null;
}) {
  const content = (
    <span className="flex items-center gap-3">
      <Avatar name={person.displayName} avatarUrl={person.avatarUrl} />
      <span className="min-w-0">
        <span className="block font-medium text-[var(--ink)]">{person.displayName}</span>
        {person.secondary ? (
          <span className="block text-xs text-[var(--ink-soft)]">{person.secondary}</span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="hover:opacity-80">
      {content}
    </Link>
  );
}
