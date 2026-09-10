"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { marketingAudienceTabs } from "@/lib/marketing/marketing-pages";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function HomeSplitMobileMenu({ align = "start" }: { align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="home-split__mobile-menu">
      <button
        ref={triggerRef}
        type="button"
        className="home-split__hamburger"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
      </button>

      {open ? (
        <div
          id={menuId}
          className={cn(
            "home-split__mobile-menu-panel",
            align === "end" && "home-split__mobile-menu-panel--end",
          )}
        >
          <nav aria-label="Primary" className="home-split__mobile-menu-nav">
            {marketingAudienceTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="home-split__mobile-menu-link"
                onClick={() => setOpen(false)}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}

export function HomeSplitNav({ mobile = false }: { mobile?: boolean }) {
  if (mobile) {
    return <HomeSplitMobileMenu />;
  }

  return (
    <nav className="home-split__nav" aria-label="Primary">
      {marketingAudienceTabs.map((tab) => (
        <Link key={tab.href} href={tab.href} className="home-split__nav-link">
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
