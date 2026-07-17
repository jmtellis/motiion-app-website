"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Calendar,
  FolderKanban,
  LayoutDashboard,
  Library,
  MessageSquare,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { buyerNavItems } from "@/lib/talent-buyers/dashboard-data";

import "./buyer-ui.css";

const QUICK_ACTIONS = [
  { href: "/projects?create=1", label: "Create project", icon: FolderKanban, keywords: "new project casting audition" },
  { href: "/projects/new/casting", label: "Create casting", icon: FolderKanban, keywords: "new casting breakdown roles" },
  { href: "/calendar", label: "Create Event", icon: Calendar, keywords: "class session event" },
  { href: "/library", label: "Library", icon: Users, keywords: "roster library save collection" },
] as const;

const NAV_ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  talent: Search,
  projects: FolderKanban,
  messages: MessageSquare,
  calendar: Calendar,
  library: Library,
  settings: Settings,
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  const items = useMemo(() => {
    const nav = buyerNavItems.map((item) => ({
      href: item.href,
      label: item.label,
      icon: NAV_ICONS[item.segment] ?? LayoutDashboard,
      keywords: item.label.toLowerCase(),
    }));
    return [...nav, ...QUICK_ACTIONS];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        ("keywords" in item && item.keywords.includes(q)),
    );
  }, [items, query]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }

      if (!open) return;

      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      }

      if (event.key === "Enter" && filtered[activeIndex]) {
        event.preventDefault();
        navigate(filtered[activeIndex]!.href);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, activeIndex, navigate]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="buyer-command-palette">
          <motion.button
            type="button"
            className="buyer-command-backdrop"
            aria-label="Close command palette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.1 : 0.18 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            className="buyer-command-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Quick navigation"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="buyer-command-input-wrap">
              <Search className="size-4 shrink-0 text-white/40" aria-hidden />
              <input
                type="search"
                className="buyer-command-input"
                placeholder="Jump to talent, projects, library…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
              />
              <kbd className="buyer-command-kbd">esc</kbd>
            </div>
            <div className="buyer-command-list" role="listbox">
              {filtered.length ? (
                filtered.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href + item.label}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      data-active={index === activeIndex}
                      className="buyer-command-item"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => navigate(item.href)}
                    >
                      <span className="buyer-command-item-icon">
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      {item.label}
                    </button>
                  );
                })
              ) : (
                <p className="buyer-command-empty">No matches found.</p>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}


