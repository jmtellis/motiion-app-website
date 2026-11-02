"use client";
import { INDUSTRY_OFFER } from "@/lib/billing/industry-offer";

import { BadgeCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { trackClientEvent } from "@/lib/analytics/track-client";
import { startIndustryCheckout } from "@/lib/billing/actions";
import { getProFeature, type ProFeatureKey } from "@/lib/billing/pro-features";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";

import "./upgrade-pro.css";

export function UpgradeProDialog({
  feature,
  open,
  onClose,
}: {
  feature: ProFeatureKey | null;
  open: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const copy = feature ? getProFeature(feature) : null;

  useEffect(() => {
    if (!open || !feature) return;
    trackClientEvent("paywall_viewed", { feature, surface: "upgrade_dialog" });
  }, [open, feature]);

  function upgrade() {
    if (!feature) return;
    setError(null);
    trackClientEvent("paywall_cta_tapped", { feature, surface: "upgrade_dialog" });
    startTransition(async () => {
      let result: { url: string | null; error?: string };
      try { result = await startIndustryCheckout(); }
      catch { setError("Could not connect to billing. Please retry."); return; }
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error ?? "Could not start checkout. Try again.");
    });
  }

  return (
    <Modal
      open={open && copy != null}
      onClose={onClose}
      title={copy?.title ?? "Industry Pro"}
      description={copy?.description}
      size="sm"
      footer={
        <div className="upgrade-pro-dialog__footer">
          <button
            type="button"
            className="upgrade-pro-dialog__cta"
            disabled={isPending}
            onClick={upgrade}
          >
            <BadgeCheck className="size-3.5" aria-hidden />
            {isPending ? "Redirecting…" : INDUSTRY_OFFER.cta}
          </button>
          <p className="upgrade-pro-dialog__meta">Cancel anytime from Settings → Billing.</p>
          {error ? <p role="alert" className="upgrade-pro-dialog__error">{error}</p> : null}
        </div>
      }
    >
      <div className="upgrade-pro-dialog__card">
        <p className="upgrade-pro-dialog__eyebrow">Industry Pro · {INDUSTRY_OFFER.priceWithPeriod}</p>
        <p className="upgrade-pro-dialog__copy">
          Publish unlimited castings, create unlimited rosters, share rosters with expiring access,
          and run client shortlist reviews across projects. Project groups include group schedules
          and contextual chats. Voice search is included. These Industry benefits are also included
          with Dual Pro; invited participants can view and reply free.
        </p>
      </div>
    </Modal>
  );
}
