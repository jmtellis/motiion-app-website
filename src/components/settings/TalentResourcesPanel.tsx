"use client";

import { useState, useTransition } from "react";

import { openBillingPortal } from "@/lib/billing/actions";
import { settingsFaqSections } from "@/lib/settings/faqs";

export function TalentResourcesPanel({
  planLabel,
  canManageBilling,
}: {
  planLabel: string;
  canManageBilling: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function manageBilling() {
    setError(null);
    startTransition(async () => {
      const result = await openBillingPortal();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error ?? "Billing isn’t available for this account yet.");
    });
  }

  return (
    <div className="talent-settings-stack">
      <section className="talent-settings-card">
        <div className="talent-settings-row">
          <div>
            <h2>Subscription</h2>
            <p>{planLabel}</p>
          </div>
          {canManageBilling ? (
            <button type="button" className="talent-settings-primary" disabled={pending} onClick={manageBilling}>
              {pending ? "Opening…" : "Manage billing"}
            </button>
          ) : null}
        </div>
        <p>
          Talent Pro, Industry Pro, and Dual Pro follow the same subscription record as the app. Stripe billing can be managed here when this account has a Stripe customer.
        </p>
        {error ? <p className="talent-settings-error">{error}</p> : null}
      </section>

      <section className="talent-settings-card">
        <div className="talent-settings-row">
          <div>
            <h2>Data & privacy</h2>
            <p>Privacy policy</p>
          </div>
          <a className="talent-settings-secondary" href="https://www.motiion.app/privacy" target="_blank" rel="noreferrer">
            Open
          </a>
        </div>
      </section>

      <section className="talent-settings-card">
        <h2>FAQs</h2>
        {settingsFaqSections.map((section) => (
          <div key={section.id} className="talent-settings-faq">
            <h3>{section.title}</h3>
            {section.items.map((item) => (
              <details key={item.id}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        ))}
      </section>

      <section className="talent-settings-card">
        <div className="talent-settings-row">
          <div>
            <h2>Support</h2>
            <p>Contact us</p>
          </div>
          <a className="talent-settings-secondary" href="mailto:support@motiion.io">
            Email support
          </a>
        </div>
      </section>
    </div>
  );
}
