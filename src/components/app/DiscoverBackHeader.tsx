import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

/** Shared back chrome for Discover detail pages. */
export function DiscoverBackHeader({
  href,
  title,
  subtitle,
  handle,
  beside,
  trailing,
}: {
  href: string;
  title: string;
  subtitle?: string | null;
  /** Optional @username shown next to the title (profile pages). */
  handle?: string | null;
  /** Inline chrome beside the title (agency / union / socials). */
  beside?: ReactNode;
  /** Right-aligned chrome (tabs on profiles). */
  trailing?: ReactNode;
}) {
  const profileChrome = Boolean(handle || beside || trailing);

  return (
    <header className={`discover-detail-header${profileChrome ? " discover-detail-header--profile" : ""}`}>
      <Link href={href} className="discover-detail-header__back" aria-label="Back">
        <ChevronLeft size={20} aria-hidden />
        <span>Back</span>
      </Link>
      <div className="discover-detail-header__row">
        <div className="discover-detail-header__copy">
          <div className="discover-detail-header__title-row">
            <h1>
              {title}
              {handle ? <span className="discover-detail-header__handle">@{handle.replace(/^@/, "")}</span> : null}
            </h1>
            {beside ? <div className="discover-detail-header__beside">{beside}</div> : null}
          </div>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {trailing ? <div className="discover-detail-header__trailing">{trailing}</div> : null}
      </div>
    </header>
  );
}
