"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { CenteredAuthShell } from "@/components/auth/CenteredAuthShell";
import { completeApprovedIndustrySetup } from "@/app/talent-buyers/onboarding/actions";
import { startProjectCheckout } from "@/lib/billing/project-checkout";
import { PROJECT_CATALOG, type ProjectPlan } from "@/lib/billing/project-catalog";
import { recommendIndustryPlan } from "@/lib/talent-buyers/approved-start";
import "./industry-approved-setup.css";

const plans: { id: ProjectPlan; features: string[] }[] = [
  { id: "project_pass", features: ["One project for 90 days from activation", "3 team members", "One-time payment · no renewal"] },
  { id: "studio", features: ["1 active project at a time", "3 team members", "Wrap a project to reuse your slot"] },
  { id: "production_house", features: ["5 active projects at a time", "10 team members", "Wrap projects to reuse your slots"] },
];

export function IndustryApprovedSetup({ username: initialUsername, concurrentProjects, projectFrequency }: { username: string | null; concurrentProjects?: string | null; projectFrequency?: string | null }) {
  const router = useRouter();
  const recommendation = recommendIndustryPlan(concurrentProjects, projectFrequency);
  const [selectedPlan, setSelectedPlan] = useState<ProjectPlan>(recommendation.plan);
  const [username, setUsername] = useState(initialUsername ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [leaving, setLeaving] = useState(false);
  const busy = pending || leaving;
  const [pendingIntent, setPendingIntent] = useState<"plan" | "explore" | null>(null);
  const ready = /^[a-z0-9_]{3,30}$/.test(username);
  function continueSetup(intent: ProjectPlan | "explore") {
    if (busy || !ready) return;
    setError(null);
    setPendingIntent(intent === "explore" ? "explore" : "plan");
    startTransition(async () => {
      try {
        const result = await completeApprovedIndustrySetup(username, intent);
        if (!result.ok) { setError(result.error); return; }
        if (intent !== "explore" && result.redirectTo === `/checkout?plan=${intent}`) {
          const checkout = await startProjectCheckout(intent, "approval");
          if (!checkout.url) { setError(checkout.error ?? "Couldn’t open checkout. Please try again."); return; }
          setLeaving(true);
          window.location.assign(checkout.url);
          return;
        }
        router.replace(result.redirectTo);
        router.refresh();
      } catch { setError("Couldn’t finish setup. Your approval is safe; please try again."); }
    });
  }
  return <CenteredAuthShell wide applicationLayout showHeading={false} showAlternateAuth={false} mode="signup">
    <div className="industry-approved">
      <header className="industry-approved__intro">
        <h1>You’re approved</h1>
        <p>Choose a plan to create your first project, or explore the platform.</p>
      </header>
      <fieldset className="approval-plans" disabled={busy}>
        <legend className="sr-only">Choose your project plan</legend>
        {plans.map(plan => {
          const offer = PROJECT_CATALOG[plan.id];
          const recommended = recommendation.plan === plan.id;
          return <div key={plan.id} className={`approval-plan${selectedPlan === plan.id ? " approval-plan--selected" : ""}`}>
            <label className="approval-plan__selection">
            <input type="radio" name="approved-project-plan" value={plan.id} checked={selectedPlan === plan.id} onChange={() => setSelectedPlan(plan.id)} />
            <span className="approval-plan__top"><span className="approval-plan__badge">{recommended ? "Recommended for you" : "\u00a0"}</span><span className="approval-plan__radio" aria-hidden>{selectedPlan === plan.id && <Check size={13} strokeWidth={3} />}</span></span>
            <span className="approval-plan__name">{offer.name}</span>
            <span className="approval-plan__price">${offer.amount / 100}<span>USD {offer.mode === "payment" ? "/ project" : "/ month"}</span></span>
            <span className="approval-plan__features">{plan.features.map(feature => <span key={feature}><Check size={15} aria-hidden />{feature}</span>)}</span>
            {recommended && <span className="approval-plan__reason">{recommendation.reason}</span>}
            </label>
            <div className="approval-plan__action">
                <button type="button" className="signup-split-submit" aria-busy={busy && pendingIntent === "plan" && selectedPlan === plan.id} disabled={selectedPlan !== plan.id || busy || !ready} onClick={() => continueSetup(plan.id)}>
                  {busy && pendingIntent === "plan" && selectedPlan === plan.id ? <><LoaderCircle className="animate-spin" size={18} aria-hidden /> Continuing…</> : <>Continue with {offer.name}<ArrowRight size={16} aria-hidden /></>}
                </button>
                <p>{offer.mode === "payment" ? `$${offer.amount / 100} once. No subscription.` : `$${offer.amount / 100}/month until canceled.`} Payment comes next.</p>
            </div>
          </div>;
        })}
      </fieldset>
      <div className="industry-approved__next">
        {!initialUsername && <label className="signup-split-field"><span>Choose a username</span><input value={username} disabled={busy} autoComplete="username" maxLength={30} onChange={event => setUsername(event.target.value.toLowerCase().replace(/^@/, ""))} /><small className="signup-split-hint">3–30 lowercase letters, numbers, or underscores.</small></label>}
        {error && <p className="signup-split-error" role="alert">{error}</p>}
        <button type="button" className="signup-split-submit" aria-busy={busy && pendingIntent === "explore"} disabled={busy || !ready} onClick={() => continueSetup("explore")}>{busy && pendingIntent === "explore" && <LoaderCircle className="animate-spin" size={18} aria-hidden />}{busy && pendingIntent === "explore" ? "Opening workspace…" : "Explore the platform first"}</button>

      </div>
    </div>
  </CenteredAuthShell>;
}
