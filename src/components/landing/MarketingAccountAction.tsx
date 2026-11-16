"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { completeApprovedIndustrySetup } from "@/app/talent-buyers/onboarding/actions";
import type { MarketingAccountAction as AccountAction } from "@/lib/marketing/account-navigation";

/** Keep public pages cacheable; only this small, private account lookup is dynamic. */
export function MarketingAccountAction() {
  const pathname = usePathname();
  const router = useRouter();
  const [action, setAction] = useState<AccountAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  useEffect(() => {
    let disposed = false;
    let request: AbortController | undefined;
    async function refresh() {
      if (disposed) return;
      request?.abort();
      const controller = new AbortController();
      request = controller;
      try {
        const response = await fetch("/api/marketing/account", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) });
        if (!response.ok) throw new Error("Unavailable");
        const next: AccountAction = await response.json();
        if (!controller.signal.aborted && !disposed) setAction(next);
      } catch {
        if (!controller.signal.aborted && !disposed) setAction({ label: "Account", href: "/dashboard" });
      }
    }
    void refresh();
    const client = createClientSupabaseClient();
    const subscription = client?.auth.onAuthStateChange(event => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") {
        request?.abort();
        setAction(event === "SIGNED_OUT" ? { label: "Log in", href: "/login" } : null);
        // Avoid additional auth work inside Supabase's auth event lock.
        queueMicrotask(() => { void refresh(); });
      }
    });
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", refresh);
    return () => {
      disposed = true;
      request?.abort();
      subscription?.data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", refresh);
    };
  }, [pathname]);

  if (!action) return <span className="marketing-account-loading" role="status" aria-label="Loading account"><LoaderCircle size={15} className="animate-spin" aria-hidden /></span>;
  if (!action.completeSetup) return <Link className="marketing-account-link" href={action.href}>{action.label}</Link>;
  return <div className="marketing-account-entry">
    <button type="button" className="marketing-account-link" disabled={busy} aria-busy={busy} onClick={() => {
      setError(null);
      startTransition(async () => {
        try {
          const result = await completeApprovedIndustrySetup();
          if (!result.ok) { setError(result.error); return; }
          router.replace(result.redirectTo);
          router.refresh();
        } catch { setError("Couldn’t open your workspace. Please try again."); }
      });
    }}>{busy && <LoaderCircle size={15} className="animate-spin" aria-hidden />}Dashboard</button>
    {error && <p className="marketing-account-error" role="alert">{error} <Link href="/talent-buyers/onboarding">Return to setup</Link></p>}
  </div>;
}
