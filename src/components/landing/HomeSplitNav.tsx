"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  homeSplitNav,
  type HomeSplitNavGroup,
} from "@/lib/marketing/homepage-content";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function NavDropdown({
  group,
  open,
  onOpenChange,
}: {
  group: HomeSplitNavGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const focusItem = useCallback((index: number) => {
    const items = itemRefs.current.filter(Boolean);
    if (!items.length) return;
    const next = ((index % items.length) + items.length) % items.length;
    items[next]?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="home-split__nav-item">
      <button
        ref={triggerRef}
        type="button"
        className={cn("home-split__nav-trigger", open && "home-split__nav-trigger--open")}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => onOpenChange(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenChange(true);
            window.requestAnimationFrame(() => focusItem(0));
          }
        }}
      >
        {group.label}
        <ChevronDown className="home-split__nav-chevron" aria-hidden strokeWidth={2} />
      </button>

      {open ? (
        <div id={menuId} role="menu" className="home-split__nav-menu">
          {group.items.map((item, index) => (
            <Link
              key={item.href + item.label}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              href={item.href}
              role="menuitem"
              tabIndex={0}
              className="home-split__nav-menu-link"
              onClick={() => onOpenChange(false)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  focusItem(index + 1);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  if (index === 0) {
                    triggerRef.current?.focus();
                  } else {
                    focusItem(index - 1);
                  }
                } else if (event.key === "Home") {
                  event.preventDefault();
                  focusItem(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  focusItem(group.items.length - 1);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  onOpenChange(false);
                  triggerRef.current?.focus();
                } else if (event.key === "Tab") {
                  onOpenChange(false);
                }
              }}
            >
              <span className="home-split__nav-menu-label">{item.label}</span>
              <span className="home-split__nav-menu-desc">{item.description}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HomeSplitNav({ mobile = false }: { mobile?: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (mobile) {
    return (
      <nav className="home-split__nav home-split__nav--mobile" aria-label="Primary">
        {homeSplitNav.map((group) => (
          <details key={group.id} className="home-split__nav-details">
            <summary className="home-split__nav-summary">
              {group.label}
              <ChevronDown className="home-split__nav-chevron" aria-hidden strokeWidth={2} />
            </summary>
            <div className="home-split__nav-details-list">
              {group.items.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="home-split__nav-details-link"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </details>
        ))}
      </nav>
    );
  }

  return (
    <nav className="home-split__nav" aria-label="Primary">
      {homeSplitNav.map((group) => (
        <NavDropdown
          key={group.id}
          group={group}
          open={openId === group.id}
          onOpenChange={(next) => setOpenId(next ? group.id : null)}
        />
      ))}
    </nav>
  );
}
