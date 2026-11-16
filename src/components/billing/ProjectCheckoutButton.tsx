"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { startProjectCheckout } from "@/lib/billing/project-checkout";
export function ProjectCheckoutButton({plan}: {plan: string}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [leaving, setLeaving] = useState(false);
  const started = useRef(false);
  function openCheckout() {
    setError(undefined);
    start(async () => {
      try {
        const result = await startProjectCheckout(plan);
        if (result.url) { setLeaving(true); window.location.assign(result.url); }
        else setError(result.error ?? "Checkout could not be opened. Please retry.");
      } catch { setError("Could not connect to checkout. Please retry."); }
    });
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    openCheckout();
    // The route is keyed by plan. Guard against Strict Mode effect replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return error ? <><p role="alert">{error}</p><button className="ui-button" disabled={pending || leaving} onClick={openCheckout}>Try again</button></> :
    <p role="status" className="flex items-center justify-center gap-3"><LoaderCircle className="animate-spin" size={20} aria-hidden />Opening secure checkout…</p>;
}
