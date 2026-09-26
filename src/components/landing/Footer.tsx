import Image from "next/image";
import Link from "next/link";
import { Instagram, Linkedin, Youtube } from "lucide-react";

import {
  footerColumns,
  footerSocialLinks,
  type FooterLink,
  type FooterSocialLink,
} from "@/lib/marketing/footer-links";

import "./footer.css";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.71 0 3.85 3.66 6.93 8.13 5.58 1.83-.53 3.14-2.25 3.28-4.2.04-.69.06-1.39.06-2.09V8.01h3.09a6.74 6.74 0 0 0 3.67 3.65V5.82h-.17z" />
    </svg>
  );
}

export function FooterSocialIcon({ link }: { link: FooterSocialLink }) {
  const iconClass = "size-3.5";
  const icon =
    link.icon === "instagram" ? (
      <Instagram className={iconClass} strokeWidth={1.75} />
    ) : link.icon === "linkedin" ? (
      <Linkedin className={iconClass} strokeWidth={1.75} />
    ) : link.icon === "youtube" ? (
      <Youtube className={iconClass} strokeWidth={1.75} />
    ) : (
      <TikTokIcon className={iconClass} />
    );

  const className =
    "inline-flex text-[#b8b8b8] transition-colors hover:text-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

  if (link.href === "#") {
    return (
      <span className={`${className} cursor-default`} aria-label={link.label} title={link.label}>
        {icon}
      </span>
    );
  }

  return (
    <a href={link.href} className={className} aria-label={link.label} target="_blank" rel="noopener noreferrer">
      {icon}
    </a>
  );
}

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className = "text-sm text-[#8a8a8a] transition-colors hover:text-[#fafafa]";

  if (link.href.startsWith("mailto:")) {
    return (
      <a href={link.href} className={className}>
        {link.label}
      </a>
    );
  }

  if (link.href.startsWith("http://") || link.href.startsWith("https://")) {
    return (
      <a href={link.href} className={className}>
        {link.label}
      </a>
    );
  }

  if (link.href === "#") {
    return (
      <span className="cursor-default text-sm text-[#828282]" aria-disabled="true">
        {link.label}
      </span>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="landing-footer__column">
      <h3 className="mkt-eyebrow text-[#8f8f8f]">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <FooterLinkItem link={link} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterVisionBlurb() {
  return (
    <div className="max-w-sm space-y-3">
      <Image src="/marketing/footer-logo.svg" alt="Motiion" width={55} height={40} className="landing-footer__logo" />
      <p className="text-base font-semibold tracking-tight text-[#fafafa]">Moving the industry forward</p>
      <p className="text-sm leading-relaxed text-[#8a8a8a]">
        We envision a future where every creative has access to the tools, relationships, and
        opportunities needed to turn passion into a sustainable career.
      </p>
    </div>
  );
}

export function Footer({
  className,
  bare = false,
  reveal = false,
}: {
  className?: string;
  bare?: boolean;
  /** Footer reveal panel: vision only on mobile; full footer from md up. */
  reveal?: boolean;
}) {
  const year = new Date().getFullYear();
  const transparentSurface = bare || reveal;

  return (
    <footer
      className={`relative overflow-hidden text-white${transparentSurface ? " bg-transparent" : " bg-[#111111]"}${className ? ` ${className}` : ""}`}
    >
      {!transparentSurface ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #111 0%, rgb(17 17 17 / .76) 35%, rgb(10 12 14 / .35) 100%), url(/footer-background.png) center bottom / cover no-repeat",
          }}
          aria-hidden
        />
      ) : null}

      <div
        className={`landing-footer__inner relative z-10 mkt-container ${
          reveal ? "landing-footer__inner--reveal" : "py-16 pb-20 lg:py-20 lg:pb-24"
        }`}
      >
        <div className="landing-footer__top">
          <FooterVisionBlurb />

          {/* Every destination stays reachable at every width — a reveal must
              never cost navigation access. */}
          <nav aria-label="Footer" className="landing-footer__nav">
            {footerColumns.map((column) => (
              <FooterColumn key={column.title} title={column.title} links={column.links} />
            ))}
          </nav>
        </div>

        <div className="landing-footer__meta">
          <div className="landing-footer__meta-divider" aria-hidden />
          <div className="landing-footer__meta-row">
            <p>© {year} Motiion Ventures, Inc.</p>
            <div className="flex items-center gap-2.5" aria-label="Social media">
              {footerSocialLinks.map((link) => (
                <FooterSocialIcon key={link.label} link={link} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
