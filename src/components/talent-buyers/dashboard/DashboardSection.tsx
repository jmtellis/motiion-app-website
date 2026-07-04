import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function DashboardSection({
  children,
  className = "",
  cornerHref,
  cornerLabel = "Open section",
}: {
  children: ReactNode;
  className?: string;
  cornerHref?: string;
  cornerLabel?: string;
}) {
  return (
    <section className={`relative ${className}`}>
      {cornerHref ? (
        <Link href={cornerHref} className="bd-corner-arrow" aria-label={cornerLabel}>
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      ) : null}
      {children}
    </section>
  );
}
