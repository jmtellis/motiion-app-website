"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { MotiionScrolledWordmark } from "@/components/brand/MotiionScrolledWordmark";
import { marketingPageLinkCurrent, marketingPageLinks } from "@/lib/marketing/site-nav";
import { MarketingAccountAction } from "./MarketingAccountAction";
import { IosDownloadHeroButton } from "./IosDownloadHeroButton";
import "./marketing-header.css";

/** Shared navigation for marketing, storefront and authentication pages. */
export function HomeMarketingHeaderClient({ overlay = false, accountMenu }: { overlay?: boolean; accountMenu?: ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuOpen = openPath === pathname;
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 2);
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, [pathname]);

  return (
    <header onKeyDown={event => { if (event.key === "Escape" && menuOpen) { setOpenPath(null); menuButton.current?.focus(); } }} className={`marketing-site-header${scrolled || menuOpen ? " is-scrolled" : ""}${overlay ? " marketing-site-header--overlay" : ""}`}>
      <div className="marketing-site-header__inner">
        <Link href="/" className="marketing-site-header__brand" aria-label="Motiion home">
          <MotiionScrolledWordmark priority />
        </Link>
        <button ref={menuButton} type="button" className="marketing-site-header__toggle" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="marketing-navigation" onClick={() => setOpenPath(menuOpen ? null : pathname)}>{menuOpen ? <X aria-hidden size={22} /> : <Menu aria-hidden size={22} />}</button>
        <nav id="marketing-navigation" aria-label="Main navigation" className={`marketing-site-header__nav${menuOpen ? " is-open" : ""}`} onClick={event => { if (event.target instanceof Element && event.target.closest("a")) setOpenPath(null); }}>
          {marketingPageLinks.map((link) => (
            <Link key={link.href} href={link.href} aria-current={marketingPageLinkCurrent(pathname, link.href)}>
              {link.label}
            </Link>
          ))}
          <IosDownloadHeroButton iconOnly className="marketing-site-header__download" />
          <div className="marketing-site-header__account">{accountMenu ?? <MarketingAccountAction />}</div>
        </nav>
      </div>
    </header>
  );
}
