"use client";
import { useState, useTransition } from "react";
import { startProjectCheckout } from "@/lib/billing/project-checkout";
export function ProjectCheckoutButton({plan}: {plan: string}) {
  const [pending,start] = useTransition(); const [error,setError] = useState<string>();
  return <><button className="ui-button" disabled={pending} onClick={() => {setError(undefined);start(async () => {
    try { const result = await startProjectCheckout(plan); if (result.url) window.location.assign(result.url); else setError(result.error); }
    catch {setError("Could not connect to checkout. Please retry.");}
  });}}>{pending ? "Opening checkout…" : "Continue to payment"}</button>{error ? <p role="alert">{error}</p> : null}</>;
}
