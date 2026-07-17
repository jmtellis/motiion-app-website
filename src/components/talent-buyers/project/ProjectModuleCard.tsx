import Link from "next/link";
import type { ReactNode } from "react";

export function ProjectModuleCard({
  title,
  description,
  href,
  count,
  action,
}: {
  title: string;
  description: string;
  href: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white/92">{title}</h3>
          <p className="mt-1 text-sm text-white/50">{description}</p>
          {typeof count === "number" ? (
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-[#2dd4bf]">
              {count} {count === 1 ? "item" : "items"}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <Link href={href} className="mt-4 inline-flex text-sm font-medium text-[#2dd4bf] hover:text-[#5eead4]">
        Open {title.toLowerCase()} hub
      </Link>
    </div>
  );
}
