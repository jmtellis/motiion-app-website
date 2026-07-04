import Link from "next/link";
import { Instagram, Linkedin, Youtube } from "lucide-react";

import {
  footerColumns,
  footerSocialLinks,
  type FooterLink,
  type FooterSocialLink,
} from "@/lib/marketing/footer-links";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.71 0 3.85 3.66 6.93 8.13 5.58 1.83-.53 3.14-2.25 3.28-4.2.04-.69.06-1.39.06-2.09V8.01h3.09a6.74 6.74 0 0 0 3.67 3.65V5.82h-.17z" />
    </svg>
  );
}

function FooterSocialIcon({ link }: { link: FooterSocialLink }) {
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
    "inline-flex text-white/45 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60";

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
  const className = "text-sm text-white/75 transition-colors hover:text-white";

  if (link.href.startsWith("mailto:")) {
    return (
      <a href={link.href} className={className}>
        {link.label}
      </a>
    );
  }

  if (link.href === "#") {
    return (
      <span className="cursor-default text-sm text-white/50" aria-disabled="true">
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
    <div className="w-[7.25rem] shrink-0">
      <h3 className="text-xs font-semibold tracking-[0.16em] text-white/50 uppercase">{title}</h3>
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

export function Footer({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`relative overflow-hidden border-t border-white/10 text-white${className ? ` ${className}` : ""}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[#0a1214] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/footer-background.png)" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[#0a1214]/35" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="max-w-sm space-y-3">
            <p className="text-base font-semibold tracking-tight text-white">
              Moving the industry forward
            </p>
            <p className="text-sm leading-relaxed text-white/75">
              Motiion aims to empower every creative to build a successful, lasting career with
              tools that support their craft. We bridge the gap between innovation and artistry,
              helping creators move with purpose, strengthen connections, and turn their passion
              into sustainable careers.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap justify-end gap-x-5 gap-y-8 lg:gap-x-6 lg:gap-y-0"
          >
            {footerColumns.map((column) => (
              <FooterColumn key={column.title} title={column.title} links={column.links} />
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/50 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p>© {year} Motiion. All rights reserved.</p>
            <div className="flex items-center gap-2.5" aria-label="Social media">
              {footerSocialLinks.map((link) => (
                <FooterSocialIcon key={link.label} link={link} />
              ))}
            </div>
          </div>
          <p className="text-white/40">Built for dance and the creative industries.</p>
        </div>
      </div>
    </footer>
  );
}
