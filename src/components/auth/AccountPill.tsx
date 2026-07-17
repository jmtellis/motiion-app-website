"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { createClientSupabaseClient } from "@/lib/supabase/client";

export type AccountPillUser = {
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  profileHref: string;
  settingsHref?: string;
};

function getMenuLinks(user: AccountPillUser) {
  return [
    { label: "Profile", href: user.profileHref },
    { label: "Calendar", href: "/calendar" },
    { label: "Settings", href: user.settingsHref ?? "/settings" },
  ];
}

export function AccountPill({ user }: { user: AccountPillUser }) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClientSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2.5 rounded-full border border-[#262626] bg-[#1e1e1e] py-1 pl-3 pr-1.5 text-white transition hover:bg-[#2a2a2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <Menu className="size-5 shrink-0 text-white/85" aria-hidden />
        <span className="relative inline-flex size-8 shrink-0 overflow-hidden rounded-full bg-[#0c2a26]">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt=""
              width={32}
              height={32}
              className="size-full object-cover"
              unoptimized
            />
          ) : (
            <span className="flex size-full items-center justify-center text-xs font-semibold tracking-tight text-[#2dd4bf]">
              {user.initials}
            </span>
          )}
        </span>
        <span className="sr-only">Account menu for {user.fullName}</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[11rem] overflow-hidden rounded-[14px] border border-[#262626] bg-[#151515] py-1"
        >
          {getMenuLinks(user).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                className="block px-4 py-2.5 text-sm font-medium text-[#eaeaea] transition hover:bg-[#1e1e1e]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
          ))}
          <div className="my-1 border-t border-[#262626]" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-[#eaeaea] transition hover:bg-[#1e1e1e] disabled:opacity-50"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
