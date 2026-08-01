"use client";

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
      const result = await startIndustryCheckout();
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
            {isPending ? "Redirecting…" : "Start 60-day free trial"}
          </button>
          <p className="upgrade-pro-dialog__meta">Cancel anytime from Settings → Billing.</p>
          {error ? <p className="upgrade-pro-dialog__error">{error}</p> : null}
        </div>
      }
    >
      <div className="upgrade-pro-dialog__card">
        <p className="upgrade-pro-dialog__eyebrow">Industry Pro</p>
        <p className="upgrade-pro-dialog__copy">
          Get full access to casting, talent search, and outreach. Enter a card to start — you won’t
          be charged until the trial ends.
        </p>
      </div>
    </Modal>
  );
}
