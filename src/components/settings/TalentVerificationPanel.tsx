"use client";

import { useEffect, useState, useTransition } from "react";

import { processOnboardingResume } from "@/app/onboarding/media-actions";
import { importPortfolioResume } from "@/app/portfolio/material-actions";
import {
  fetchConnectAccountStatus,
  startStripeConnectOnboarding,
} from "@/app/(buyer-app)/(paid)/calendar/connect-actions";
import {
  claimCreditMentions,
  respondToCreditAttribution,
  startTalentIdentityVerification,
  type CreditAttributionItem,
  type CreditClaimItem,
} from "@/app/settings/work-actions";
import { renderPdfPagesToJpegBlobs } from "@/lib/onboarding/client-media";

function identityLabel(status: string) {
  switch (status) {
    case "verified":
      return "Verified";
    case "processing":
      return "In review";
    case "requires_input":
      return "Needs attention";
    default:
      return "Not verified";
  }
}

export function TalentVerificationPanel({
  resumeUrl,
  identityStatus,
  attributions,
  claims,
  showCreditClaims,
  connectReturn,
}: {
  resumeUrl: string | null;
  identityStatus: string;
  attributions: CreditAttributionItem[];
  claims: CreditClaimItem[];
  showCreditClaims: boolean;
  connectReturn: boolean;
}) {
  const [resume, setResume] = useState(resumeUrl);
  const [identity, setIdentity] = useState(identityStatus);
  const [inbox, setInbox] = useState(attributions);
  const [claimRows, setClaimRows] = useState(claims);
  const [stripeLabel, setStripeLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchConnectAccountStatus();
      if (cancelled) return;
      setStripeLabel(result.ok && result.status?.isReadyToAcceptPayments ? "Connected" : "Not set up");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function uploadResume(file: File | null) {
    if (!file) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("source", file);
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (isPdf) {
          const pages = await renderPdfPagesToJpegBlobs(file);
          pages.forEach((page, index) => formData.append("pages", page, `resume_page_${index + 1}.jpg`));
        }
        const processed = await processOnboardingResume(formData);
        if (!processed.ok) {
          setError(processed.error);
          return;
        }
        const imported = await importPortfolioResume({
          resumeUrl: processed.resumeUrl,
          experiences: (processed.draftPatch.experiences ?? []).map((item) => ({
            title: item.title,
            role: item.role,
            credits: item.credits,
            category: item.category,
            start_date: item.start_date,
            end_date: item.end_date,
            notes: item.notes,
          })),
        });
        if (!imported.ok) {
          setError(imported.error);
          return;
        }
        setResume(processed.resumeUrl);
        setMessage(
          imported.added
            ? `Resume uploaded. ${imported.added} credit${imported.added === 1 ? "" : "s"} added.`
            : "Resume uploaded.",
        );
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Could not upload that resume.");
      }
    });
  }

  function connectStripe() {
    setError(null);
    startTransition(async () => {
      const result = await startStripeConnectOnboarding(
        "/settings?section=verification&connect=return",
      );
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error ?? "Could not start Stripe onboarding.");
    });
  }

  function startIdentity() {
    setError(null);
    startTransition(async () => {
      const result = await startTalentIdentityVerification();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.alreadyVerified) {
        setIdentity("verified");
        setMessage("Identity already verified.");
        return;
      }
      if (result.url) window.location.href = result.url;
    });
  }

  function respond(mentionId: string, action: "confirm" | "decline" | "revoke") {
    setError(null);
    startTransition(async () => {
      const result = await respondToCreditAttribution(mentionId, action);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setInbox((current) => current.filter((item) => item.mentionId !== mentionId));
    });
  }

  function claim(mentionId: string) {
    setError(null);
    startTransition(async () => {
      const result = await claimCreditMentions([mentionId]);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setClaimRows((current) => current.filter((item) => item.mentionId !== mentionId));
      setMessage("Credit claimed.");
    });
  }

  return (
    <div className="talent-settings-stack">
      <section className="talent-settings-card">
        <div className="talent-settings-row">
          <div>
            <h2>Upload resume</h2>
            <p>{resume ? "Uploaded" : "Not uploaded"}</p>
          </div>
          <label className="talent-settings-secondary">
            {pending ? "Uploading…" : resume ? "Replace resume" : "Upload resume"}
            <input
              type="file"
              accept="application/pdf,image/*"
              hidden
              disabled={pending}
              onChange={(event) => uploadResume(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        {resume ? (
          <a href={resume} target="_blank" rel="noreferrer">
            View current resume
          </a>
        ) : null}
      </section>

      {showCreditClaims ? (
        <section className="talent-settings-card">
          <h2>Credits with your name</h2>
          {claimRows.length ? (
            <ul className="talent-settings-list">
              {claimRows.map((item) => (
                <li key={item.mentionId}>
                  <div>
                    <strong>{item.experienceTitle || item.rawName}</strong>
                    <p>
                      {item.mentioningDisplayName}
                      {item.corroboratingCount > 1 ? ` · ${item.corroboratingCount} mentions` : ""}
                    </p>
                  </div>
                  <button type="button" className="talent-settings-secondary" disabled={pending} onClick={() => claim(item.mentionId)}>
                    Claim
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No unclaimed credits are waiting for you.</p>
          )}
        </section>
      ) : null}

      <section className="talent-settings-card">
        <h2>Credit attributions</h2>
        {inbox.length ? (
          <ul className="talent-settings-list">
            {inbox.map((item) => (
              <li key={item.mentionId}>
                <div>
                  <strong>{item.experienceTitle || item.rawName}</strong>
                  <p>
                    {item.claimantDisplayName} · {item.claimStatus}
                  </p>
                </div>
                <div className="talent-settings-actions">
                  <button type="button" className="talent-settings-secondary" disabled={pending} onClick={() => respond(item.mentionId, "confirm")}>
                    Confirm
                  </button>
                  <button type="button" className="talent-settings-secondary" disabled={pending} onClick={() => respond(item.mentionId, "decline")}>
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No credit claims are waiting for a response.</p>
        )}
      </section>

      <section className="talent-settings-card">
        <div className="talent-settings-row">
          <div>
            <h2>Identity verification</h2>
            <p>{identityLabel(identity)}</p>
          </div>
          <button type="button" className="talent-settings-primary" disabled={pending || identity === "verified"} onClick={startIdentity}>
            {identity === "verified" ? "Verified" : "Verify identity"}
          </button>
        </div>
        <p>Stripe Identity uses the same verification and one-time fee as the Motiion app.</p>
      </section>

      <section className="talent-settings-card">
        <div className="talent-settings-row">
          <div>
            <h2>Stripe Connect</h2>
            <p>{stripeLabel ?? (connectReturn ? "Checking Stripe…" : "Not set up")}</p>
          </div>
          <button type="button" className="talent-settings-primary" disabled={pending || stripeLabel === "Connected"} onClick={connectStripe}>
            {stripeLabel === "Connected" ? "Connected" : "Set up payouts"}
          </button>
        </div>
        {connectReturn && stripeLabel !== "Connected" ? (
          <p>Finish any remaining Stripe steps, then return here to confirm you&apos;re ready.</p>
        ) : null}
      </section>

      {error ? <p className="talent-settings-error">{error}</p> : null}
      {message ? <p className="talent-settings-success">{message}</p> : null}
    </div>
  );
}
