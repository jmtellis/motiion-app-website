"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";

import { switchProfileShell } from "@/app/settings/shell-actions";
import type { ShellMenuAction } from "@/lib/auth/profile";
import { createClientSupabaseClient } from "@/lib/supabase/client";


export function WorkspaceAccountMenu({
  className = "",
  buttonClassName,
  label,
  settingsHref,
  shellAction,
  children,
}: {
  className?: string;
  buttonClassName: string;
  label: string;
  settingsHref: string;
  shellAction: ShellMenuAction | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"up" | "down">("up");
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      close();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      close();
      rootRef.current?.querySelector("button")?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  function switchShell(shell: "talent" | "lookingForTalent") {
    setError(null);
    startTransition(async () => {
      const result = await switchProfileShell(shell);
      if (result && !result.ok) setError(result.error);
    });
  }

  async function signOut() {
    setSigningOut(true);
    const supabase = createClientSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    close();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={rootRef} className={`workspace-account-menu ${className}`.trim()}>
      <button
        type="button"
        className={`workspace-account-trigger ${buttonClassName}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => {
          if (open) { close(); return; }
          const rect = rootRef.current?.getBoundingClientRect();
          setPlacement(rect && rect.top > 180 ? "up" : "down");
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className="workspace-account-popover"
          data-placement={placement}
        >
            <>
              <Link href={settingsHref} role="menuitem" onClick={close}>
                Settings
              </Link>
              {shellAction?.kind === "link" ? (
                <Link href={shellAction.href} role="menuitem" onClick={close}>
                  {shellAction.label}
                </Link>
              ) : null}
              {shellAction?.kind === "switch" ? (
                <button
                  type="button"
                  role="menuitem"
                  disabled={isPending}
                  onClick={() => switchShell(shellAction.shell)}
                >
                  {isPending ? "Switching…" : shellAction.label}
                </button>
              ) : null}
              {error ? <p className="workspace-account-popover__error">{error}</p> : null}
              <div className="workspace-account-popover__separator" role="separator" />
              <button type="button" role="menuitem" disabled={signingOut || isPending} onClick={signOut}>
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
        </div>
      ) : null}
    </div>
  );
}
