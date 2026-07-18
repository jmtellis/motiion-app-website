"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Camera, Check, ChevronLeft, ChevronRight } from "lucide-react";

import { completeTalentBuyerOnboarding } from "@/app/talent-buyers/onboarding/actions";
import {
  getIndustryIdentityStatus,
  refreshIndustryIdentityVerification,
  startIndustryIdentityVerification,
} from "@/app/talent-buyers/onboarding/identity-actions";
import { updateBuyerAvatar } from "@/app/(buyer-app)/dashboard/settings/actions";
import { SetupFlowCancelButton } from "@/components/auth/SetupFlowCancelButton";
import { SetupFlowFormPanel } from "@/components/auth/SetupFlowFormPanel";
import { SignupSplitShell } from "@/components/auth/SignupSplitShell";
import { AuthField, AuthInput } from "@/components/auth/ui";
import { MarketPlacesSelector } from "@/components/talent-buyers/MarketPlacesSelector";
import { resizeImageFile } from "@/lib/onboarding/client-media";
import { getSetupFlowShellProps } from "@/lib/setup-flow/config";
import { setupChoiceCard, setupPill } from "@/lib/setup-flow/form-styles";
import {
  clearTalentBuyerDraft,
  loadTalentBuyerDraft,
  saveTalentBuyerDraft,
} from "@/lib/talent-buyers/draft-storage";
import {
  companySizeOptions,
  defaultBuyerNotificationPreferences,
  getNextTalentBuyerStep,
  getPreviousTalentBuyerStep,
  getTalentBuyerFlowProgress,
  marketsFromPlaces,
  primaryGoalOptions,
  roleOptions,
  validateTalentBuyerStep,
} from "@/lib/talent-buyers/onboarding";
import type { DashboardProfile } from "@/types/database";
import type {
  IndustryIdentityStatus,
  TalentBuyerMarketPlace,
  TalentBuyerOnboardingDraft,
  TalentBuyerOnboardingStep,
} from "@/types/talent-buyers";

function createInitialDraft(profile: DashboardProfile): TalentBuyerOnboardingDraft {
  return {
    version: 2,
    userId: profile.id,
    currentStep: "primaryGoal",
    dateOfBirth: "",
    fullName: profile.fullName ?? "",
    contactEmail: profile.email ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    primaryGoal: profile.primaryGoal ?? "",
    role: profile.buyerRole ?? "",
    organizationName: profile.organizationName ?? profile.companyName ?? "",
    organizationWebsite: profile.organizationWebsite ?? "",
    companySize: (profile.companySize as TalentBuyerOnboardingDraft["companySize"]) ?? "",
    markets: [],
    marketPlaces: [],
    verificationLinks: {},
    notificationPreferences: { ...defaultBuyerNotificationPreferences },
  };
}

const stepCopy: Record<TalentBuyerOnboardingStep, { title: string; subtitle?: string }> = {
  primaryGoal: {
    title: "What are you here to do?",
    subtitle: "We'll tailor your dashboard around how you work.",
  },
  role: { title: "Which best describes you?" },
  organization: { title: "Tell us about your organization" },
  markets: { title: "Where do you typically work?" },
  verification: {
    title: "Verify your identity",
    subtitle: "Confirm your details and complete Stripe Identity verification to finish setup.",
  },
  success: {
    title: "You're all set.",
    subtitle: "Start discovering talent and building your network.",
  },
};

function ChoiceGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function identityStatusLabel(status: IndustryIdentityStatus | null) {
  switch (status) {
    case "verified":
      return "Identity verified";
    case "processing":
      return "Verification processing…";
    case "requires_input":
      return "Verification needs another attempt";
    case "canceled":
      return "Verification canceled";
    default:
      return "Not verified yet";
  }
}

export function TalentBuyerOnboardingFlow({ profile }: { profile: DashboardProfile }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<TalentBuyerOnboardingDraft>(() => {
    const initial = createInitialDraft(profile);
    const saved = loadTalentBuyerDraft(profile.id);
    return saved ? { ...initial, ...saved, version: 2, userId: profile.id } : initial;
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [identityStatus, setIdentityStatus] = useState<IndustryIdentityStatus | null>(null);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [identityBusy, setIdentityBusy] = useState(false);

  const progress = useMemo(() => getTalentBuyerFlowProgress(draft.currentStep), [draft.currentStep]);
  const isSuccessStep = draft.currentStep === "success";
  const firstStep = talentBuyerFirstStep();

  useEffect(() => {
    saveTalentBuyerDraft(draft);
  }, [draft]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getIndustryIdentityStatus();
      if (cancelled || !result.ok) return;
      setIdentityStatus(result.status);
      setIdentityVerified(result.verified);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateDraft(partial: Partial<TalentBuyerOnboardingDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function setMarketPlaces(marketPlaces: TalentBuyerMarketPlace[]) {
    updateDraft({
      marketPlaces,
      markets: marketsFromPlaces(marketPlaces),
    });
  }

  function goToStep(step: TalentBuyerOnboardingStep) {
    updateDraft({ currentStep: step });
    setError(null);
  }

  function handleContinue() {
    const validationError = validateTalentBuyerStep(draft.currentStep, {
      ...draft,
      identityVerified,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    if (draft.currentStep === "verification") {
      startTransition(async () => {
        const result = await completeTalentBuyerOnboarding({
          ...draft,
          version: 2,
          markets: marketsFromPlaces(draft.marketPlaces),
          primaryGoal: draft.primaryGoal as NonNullable<typeof draft.primaryGoal>,
          role: draft.role as NonNullable<typeof draft.role>,
          companySize: draft.companySize as NonNullable<typeof draft.companySize>,
          notificationPreferences: {
            ...defaultBuyerNotificationPreferences,
            ...draft.notificationPreferences,
          },
          verificationLinks: {},
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }

        clearTalentBuyerDraft(profile.id);
        goToStep("success");
      });
      return;
    }

    goToStep(getNextTalentBuyerStep(draft.currentStep));
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingAvatar(true);
    setError(null);
    try {
      const blob = await resizeImageFile(file);
      const prepared = new File([blob], file.name.replace(/\.\w+$/, ".jpg") || "avatar.jpg", {
        type: "image/jpeg",
      });
      const formData = new FormData();
      formData.set("file", prepared);
      const result = await updateBuyerAvatar(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      updateDraft({ avatarUrl: result.avatarUrl });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not update photo.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function pollIdentityUntilSettled() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const result = await refreshIndustryIdentityVerification();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIdentityStatus(result.status);
      setIdentityVerified(result.verified);
      if (result.status === "verified" || result.status === "requires_input" || result.status === "canceled") {
        return;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
  }

  async function handleStartIdentity() {
    setIdentityBusy(true);
    setError(null);
    try {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        setError("Stripe publishable key is not configured.");
        return;
      }

      const started = await startIndustryIdentityVerification();
      if (!started.ok) {
        setError(started.error);
        return;
      }

      setIdentityStatus(started.status);
      const stripe = await loadStripe(publishableKey);
      if (!stripe) {
        setError("Could not load Stripe Identity.");
        return;
      }

      const { error: stripeError } = await stripe.verifyIdentity(started.clientSecret);
      if (stripeError) {
        setError(stripeError.message ?? "Identity verification was not completed.");
      }

      await pollIdentityUntilSettled();
    } finally {
      setIdentityBusy(false);
    }
  }

  function handleDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  const shellProps = getSetupFlowShellProps({
    audience: "industry",
    surface: "onboarding",
    microStep: draft.currentStep,
    isSuccess: isSuccessStep,
  });
  const currentCopy = stepCopy[draft.currentStep];
  const initials = draft.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  function renderStepFields() {
    return (
      <>
        {draft.currentStep === "primaryGoal" ? (
          <ChoiceGrid>
            {primaryGoalOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateDraft({ primaryGoal: option.value })}
                className={setupChoiceCard(draft.primaryGoal === option.value)}
              >
                <p>{option.title}</p>
                <p>{option.description}</p>
              </button>
            ))}
          </ChoiceGrid>
        ) : null}

        {draft.currentStep === "role" ? (
          <div className="flex flex-wrap gap-2">
            {roleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateDraft({ role: option.value })}
                className={setupPill(draft.role === option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {draft.currentStep === "organization" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <AuthField label="Organization name">
                <AuthInput
                  value={draft.organizationName}
                  onChange={(event) => updateDraft({ organizationName: event.target.value })}
                  placeholder="Studio, agency, or company"
                />
              </AuthField>
            </div>
            <AuthField label="Website (optional)">
              <AuthInput
                value={draft.organizationWebsite}
                onChange={(event) => updateDraft({ organizationWebsite: event.target.value })}
                placeholder="https://"
              />
            </AuthField>
            <label className="field">
              <span>Company size</span>
              <select
                value={draft.companySize}
                onChange={(event) =>
                  updateDraft({
                    companySize: event.target.value as TalentBuyerOnboardingDraft["companySize"],
                  })
                }
              >
                <option value="">Select size</option>
                {companySizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {draft.currentStep === "markets" ? (
          <MarketPlacesSelector places={draft.marketPlaces} onChange={setMarketPlaces} />
        ) : null}

        {draft.currentStep === "verification" ? (
          <div className="grid gap-5">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative size-20 shrink-0 overflow-hidden rounded-full bg-[#0c2a26] ring-1 ring-[var(--line)] transition hover:ring-[var(--accent)]"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload profile photo"
                disabled={isUploadingAvatar}
              >
                {draft.avatarUrl ? (
                  <Image
                    src={draft.avatarUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                    unoptimized
                  />
                ) : (
                  <span className="flex size-full items-center justify-center text-lg font-semibold tracking-wide text-white/90">
                    {initials || "?"}
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-[10px] font-medium uppercase tracking-wide text-white/90">
                  <Camera className="size-3" aria-hidden />
                  {isUploadingAvatar ? "…" : "Edit"}
                </span>
              </button>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--ink)]">Profile photo</p>
                <p className="text-sm text-[var(--ink-soft)]">Required for a verified industry account.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <AuthField label="Full name">
              <AuthInput
                value={draft.fullName}
                onChange={(event) => updateDraft({ fullName: event.target.value })}
                placeholder="First and last name"
                autoComplete="name"
              />
            </AuthField>

            <AuthField label="Contact email">
              <AuthInput
                type="email"
                value={draft.contactEmail}
                onChange={(event) => updateDraft({ contactEmail: event.target.value })}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </AuthField>

            <AuthField label="Date of birth">
              <AuthInput
                type="date"
                value={draft.dateOfBirth}
                onChange={(event) => updateDraft({ dateOfBirth: event.target.value })}
                required
              />
            </AuthField>

            <div className="rounded-2xl border border-[var(--line)] px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--ink)]">Stripe Identity</p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {identityStatusLabel(identityStatus)}
                  </p>
                </div>
                {identityVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--accent),white_84%)] px-3 py-1 text-sm font-medium text-[var(--accent-dark)]">
                    <Check className="size-3.5" />
                    Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    className="signup-split-nav-btn"
                    onClick={() => {
                      void handleStartIdentity();
                    }}
                    disabled={identityBusy || isPending}
                  >
                    {identityBusy
                      ? "Opening…"
                      : identityStatus === "requires_input"
                        ? "Retry verification"
                        : "Verify with Stripe"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {draft.currentStep === "success" ? (
          <div className="flex justify-center py-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--accent),white_84%)] text-[var(--accent-dark)]">
              <Check className="size-8" />
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <SignupSplitShell {...shellProps}>
      <SetupFlowFormPanel
        title={currentCopy.title}
        subtitle={currentCopy.subtitle}
        error={error}
        progressFirst
        progressLabel={isSuccessStep ? undefined : progress.sectionTitle}
        progressPercent={isSuccessStep ? undefined : progress.percent}
        progressCurrent={isSuccessStep ? undefined : progress.currentStep}
        progressTotal={isSuccessStep ? undefined : progress.totalSteps}
        footer={
          <>
            {!isSuccessStep ? (
              <div className="signup-split-form__footer-start">
                <SetupFlowCancelButton
                  userId={profile.id}
                  disabled={isPending || identityBusy || isUploadingAvatar}
                  onCanceled={() => clearTalentBuyerDraft(profile.id)}
                  onError={setError}
                />
                {draft.currentStep !== firstStep ? (
                  <button
                    type="button"
                    className="signup-split-nav-btn signup-split-nav-btn--ghost"
                    onClick={() => goToStep(getPreviousTalentBuyerStep(draft.currentStep))}
                    disabled={isPending || identityBusy}
                  >
                    <ChevronLeft className="size-4" />
                    Back
                  </button>
                ) : null}
              </div>
            ) : (
              <span />
            )}

            {isSuccessStep ? (
              <button type="button" className="signup-split-submit ml-auto !w-auto px-5" onClick={handleDashboard}>
                Go to Dashboard
              </button>
            ) : (
              <button
                type="button"
                className="signup-split-submit ml-auto !w-auto px-5"
                onClick={handleContinue}
                disabled={isPending || identityBusy || isUploadingAvatar}
              >
                {isPending
                  ? "Saving…"
                  : draft.currentStep === "verification"
                    ? "Finish setup"
                    : "Continue"}
                {!isPending ? <ChevronRight className="ml-1 inline size-4" /> : null}
              </button>
            )}
          </>
        }
      >
        {renderStepFields()}
      </SetupFlowFormPanel>
    </SignupSplitShell>
  );
}

function talentBuyerFirstStep(): TalentBuyerOnboardingStep {
  return "primaryGoal";
}
