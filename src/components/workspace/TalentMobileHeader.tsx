"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";

import "@/components/landing/marketing-header.css";
import "./mobile-workspace-header.css";

import { MotiionScrolledWordmark } from "@/components/brand/MotiionScrolledWordmark";

/** Mobile app bar: landing-style wordmark and menu, without the test-environment notice. */
export function TalentMobileHeader({
  homeHref,
  navigation,
  account,
}: {
  homeHref: string;
  navigation: ReactNode;
  account?: ReactNode;
}) {
  const pathname = usePathname();
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (next: boolean) => setOpenPath(next ? pathname : null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (query.matches) setOpenPath(null);
    };
    query.addEventListener("change", closeOnDesktop);
    return () => query.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenPath(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpenPath(null); toggleRef.current?.focus(); }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function closeOnNavigate(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a")) setOpen(false);
  }

  return (
    <header
      ref={rootRef}
      className={`talent-mobile-header marketing-site-header is-scrolled${open ? " is-open" : ""}`}
    >
      <div className="talent-mobile-header__bar marketing-site-header__inner">
        <button
          ref={toggleRef}
          type="button"
          className="talent-mobile-header__toggle marketing-site-header__toggle"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen(!open)}
        >
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
        <Link href={homeHref} className="talent-mobile-header__brand marketing-site-header__brand" aria-label="Motiion home">
          <MotiionScrolledWordmark priority />
        </Link>
        <span className="talent-mobile-header__balance" aria-hidden />
      </div>
      <div
        id={menuId}
        className={`talent-mobile-header__panel marketing-site-header__nav${open ? " is-open" : ""}`}
        hidden={!open}
        onClick={closeOnNavigate}
      >
        <nav aria-label="App" className="talent-mobile-header__nav">
          {navigation}
        </nav>
        {account ? <div className="talent-mobile-header__account">{account}</div> : null}
      </div>
    </header>
  );
}
