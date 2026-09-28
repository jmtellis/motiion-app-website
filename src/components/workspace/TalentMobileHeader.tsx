"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { MotiionScrolledWordmark } from "@/components/brand/MotiionScrolledWordmark";

/** Mobile app bar: landing-style wordmark and menu, without the test-environment notice. */
export function TalentMobileHeader({
  homeHref,
  navigation,
  account,
}: {
  homeHref: string;
  navigation: ReactNode;
  account: ReactNode;
}) {
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (query.matches) setOpen(false);
    };
    query.addEventListener("change", closeOnDesktop);
    return () => query.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: globalThis.MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function closeOnNavigate(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a")) setOpen(false);
  }

  return (
    <header
      ref={rootRef}
      className={`talent-mobile-header${open ? " is-open" : ""}`}
    >
      <div className="talent-mobile-header__bar">
        <button
          type="button"
          className="talent-mobile-header__toggle"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
        <Link href={homeHref} className="talent-mobile-header__brand" aria-label="Motiion home">
          <MotiionScrolledWordmark priority />
        </Link>
        <span className="talent-mobile-header__balance" aria-hidden />
      </div>
      <div
        id={menuId}
        className="talent-mobile-header__panel"
        hidden={!open}
        onClick={closeOnNavigate}
      >
        <nav aria-label="App" className="talent-mobile-header__nav">
          {navigation}
        </nav>
        <div className="talent-mobile-header__account">{account}</div>
      </div>
    </header>
  );
}
