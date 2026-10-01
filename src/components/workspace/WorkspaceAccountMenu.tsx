"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { switchProfileShell } from "@/app/settings/shell-actions";
import type { ShellMenuAction } from "@/lib/auth/profile";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import {
  grantIndustryAccessUnlock,
  isValidIndustryAccessPassword,
} from "@/lib/talent-buyers/industry-access";

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
  const passwordRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"up" | "down">("up");
  const [passcodeOpen, setPasscodeOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setPasscodeOpen(false);
    setPassword("");
    setError(null);
  }

  useEffect(() => {
    if (!open) return;

    const rect = rootRef.current?.getBoundingClientRect();
    setPlacement(rect && rect.top > 180 ? "up" : "down");

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      close();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (passcodeOpen) {
        setPasscodeOpen(false);
        setPassword("");
        setError(null);
        return;
      }
      close();
      rootRef.current?.querySelector("button")?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, passcodeOpen]);

  useEffect(() => {
    if (!open) return;
    if (passcodeOpen) {
      passwordRef.current?.focus();
      return;
    }
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open, passcodeOpen]);

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (shellAction?.kind !== "passcode") return;
    if (!isValidIndustryAccessPassword(password)) {
      setError("Incorrect password.");
      return;
    }
    grantIndustryAccessUnlock();
    const href = shellAction.href;
    close();
    router.push(href);
  }

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
        onClick={() => (open ? close() : setOpen(true))}
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
          {passcodeOpen && shellAction?.kind === "passcode" ? (
            <form className="workspace-account-popover__passcode" onSubmit={submitPassword}>
              <p id={`${menuId}-passcode`}>Enter the industry access password to continue.</p>
              <input
                ref={passwordRef}
                type="password"
                autoComplete="current-password"
                aria-label="Industry access password"
                aria-describedby={`${menuId}-passcode`}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
              />
              {error ? <p className="workspace-account-popover__error">{error}</p> : null}
              <button type="submit" disabled={password.trim().length === 0}>
                Continue
              </button>
            </form>
          ) : (
            <>
              <Link href={settingsHref} role="menuitem" onClick={close}>
                Settings
              </Link>
              {shellAction?.kind === "link" ? (
                <Link href={shellAction.href} role="menuitem" onClick={close}>
                  {shellAction.label}
                </Link>
              ) : null}
              {shellAction?.kind === "passcode" ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setError(null);
                    setPasscodeOpen(true);
                  }}
                >
                  {shellAction.label}
                </button>
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
          )}
        </div>
      ) : null}
    </div>
  );
}
