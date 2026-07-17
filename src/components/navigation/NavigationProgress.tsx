"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import "./navigation-progress.css";

function isInternalNavHref(href: string) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  if (/^https?:\/\//i.test(href)) {
    try {
      return new URL(href).origin === window.location.origin;
    } catch {
      return false;
    }
  }
  return href.startsWith("/");
}

function normalizePath(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}

/**
 * Thin indeterminate bar shown during soft navigations while previous content stays painted.
 */
export function NavigationProgress({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActive(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || !isInternalNavHref(href)) return;

      const next = normalizePath(href);
      const current = `${window.location.pathname}${window.location.search}`;
      if (next === current) return;

      setActive(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      // Safety: never leave the bar spinning forever if navigation is cancelled.
      hideTimerRef.current = setTimeout(() => setActive(false), 8000);
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <div
      className={`nav-progress ${active ? "nav-progress--active" : ""} ${className}`.trim()}
      aria-hidden
    >
      <div className="nav-progress__bar" />
    </div>
  );
}
