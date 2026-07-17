"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";

import { completeTalentBuyerOnboarding } from "@/app/talent-buyers/onboarding/actions";
import { SetupFlowCancelButton } from "@/components/auth/SetupFlowCancelButton";
import { SetupFlowFormPanel } from "@/components/auth/SetupFlowFormPanel";
import { SignupSplitShell } from "@/components/auth/SignupSplitShell";
import {
  AuthField,
  AuthInput,
} from "@/components/auth/ui";
import { getSetupFlowShellProps } from "@/lib/setup-flow/config";
import { setupChoiceCard, setupPill } from "@/lib/setup-flow/form-styles";
import {
  clearTalentBuyerDraft,
  loadTalentBuyerDraft,
  saveTalentBuyerDraft,
} from "@/lib/talent-buyers/draft-storage";
import {
  companySizeOptions,
  getNextTalentBuyerStep,
  getPreviousTalentBuyerStep,
  getTalentBuyerFlowProgress,
  primaryGoalOptions,
  roleOptions,
  styleFocusOptions,
  suggestedMarkets,
  talentNeedOptions,
  validateTalentBuyerStep,
} from "@/lib/talent-buyers/onboarding";
import type { DashboardProfile } from "@/types/database";
import type {
  TalentBuyerOnboardingDraft,
  TalentBuyerOnboardingStep,
} from "@/types/talent-buyers";

function createInitialDraft(profile: DashboardProfile): TalentBuyerOnboardingDraft {
  return {
    version: 1,
    userId: profile.id,
    currentStep: "dateOfBirth",
    dateOfBirth: "",
    primaryGoal: profile.primaryGoal ?? "",
    role: profile.buyerRole ?? "",
    organizationName: profile.organizationName ?? profile.companyName ?? "",
    organizationWebsite: profile.organizationWebsite ?? "",
    companySize: (profile.companySize as TalentBuyerOnboardingDraft["companySize"]) ?? "",
    talentTypes: profile.buyerTalentTypes ?? [],
    styleFocus: profile.styleFocus ?? [],
    markets: profile.markets ?? [],
    verificationLinks: profile.verificationLinks ?? {},
    notificationPreferences: profile.notificationPreferences ?? {
      newTalentMatches: true,
      opportunityUpdates: true,
      industryAnnouncements: false,
    },
  };
}

const stepCopy: Record<
  TalentBuyerOnboardingStep,
  { title: string; subtitle?: string }
> = {
  dateOfBirth: {
    title: "Confirm your date of birth",
    subtitle: "We use this to verify account eligibility before you finish setup.",
  },
  primaryGoal: {
    title: "What are you here to do?",
    subtitle: "We'll tailor your dashboard around how you work.",
  },
  role: { title: "Which best describes you?" },
  organization: { title: "Tell us about your organization" },
  talentNeeds: { title: "Who are you looking for?" },
  styleFocus: { title: "What styles matter most?" },
  markets: { title: "Where do you typically work?" },
  verification: {
    title: "Verify your identity",
    subtitle: "Verified accounts receive greater trust and visibility.",
  },
  notifications: {
    title: "Stay informed",
    subtitle: "Choose what you'd like to hear about.",
  },
  success: {
    title: "You're all set.",
    subtitle: "Start discovering talent and building your network.",
  },
};

function ChoiceGrid({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function MarketSelector({
  markets,
  onChange,
}: {
  markets: string[];
  onChange: (markets: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  function addMarket(value: string) {
    const trimmed = value.trim();
    if (!trimmed || markets.includes(trimmed)) return;
    onChange([...markets, trimmed]);
    setQuery("");
  }

  return (
    <div className="space-y-4">
      <AuthField label="Primary market">
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-soft)]" />
          <AuthInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addMarket(query);
              }
            }}
            placeholder="Search or enter a market"
            className="pl-10"
          />
        </div>
      </AuthField>

      <div className="flex flex-wrap gap-2">
        {suggestedMarkets.map((market) => (
          <button
            key={market}
            type="button"
            onClick={() => addMarket(market)}
            className={setupPill(markets.includes(market))}
          >
            {market}
          </button>
        ))}
      </div>

      {markets.length ? (
        <div className="flex flex-wrap gap-2">
          {markets.map((market) => (
            <span
              key={market}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm text-[var(--ink)]"
            >
              {market}
              <button
                type="button"
                aria-label={`Remove ${market}`}
                onClick={() => onChange(markets.filter((item) => item !== market))}
                className="text-[var(--ink-soft)] transition hover:text-[var(--ink)]"
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TalentBuyerOnboardingFlow({ profile }: { profile: DashboardProfile }) {
  const router = useRouter();
  const [draft, setDraft] = useState<TalentBuyerOnboardingDraft>(() => {
    const initial = createInitialDraft(profile);
    const saved = loadTalentBuyerDraft(profile.id);
    return saved ? { ...initial, ...saved, dateOfBirth: saved.dateOfBirth ?? "" } : initial;
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const progress = useMemo(() => getTalentBuyerFlowProgress(draft.currentStep), [draft.currentStep]);
  const isSuccessStep = draft.currentStep === "success";

  useEffect(() => {
    saveTalentBuyerDraft(draft);
  }, [draft]);

  function updateDraft(partial: Partial<TalentBuyerOnboardingDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function goToStep(step: TalentBuyerOnboardingStep) {
    updateDraft({ currentStep: step });
    setError(null);
  }

  function handleContinue() {
    const validationError = validateTalentBuyerStep(draft.currentStep, draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (draft.currentStep === "notifications") {
      startTransition(async () => {
        const result = await completeTalentBuyerOnboarding({
          ...draft,
          primaryGoal: draft.primaryGoal as NonNullable<typeof draft.primaryGoal>,
          role: draft.role as NonNullable<typeof draft.role>,
          companySize: draft.companySize as NonNullable<typeof draft.companySize>,
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

  function handleSkipVerification() {
    goToStep("notifications");
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

  function renderStepFields() {
    return (
      <>
        {draft.currentStep === "dateOfBirth" ? (
          <AuthField label="Date of birth">
            <AuthInput
              type="date"
              value={draft.dateOfBirth}
              onChange={(event) => updateDraft({ dateOfBirth: event.target.value })}
              required
            />
          </AuthField>
        ) : null}

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

        {draft.currentStep === "talentNeeds" ? (
          <div className="flex flex-wrap gap-2">
            {talentNeedOptions.map((option) => {
              const selected = draft.talentTypes.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    updateDraft({
                      talentTypes: selected
                        ? draft.talentTypes.filter((item) => item !== option.value)
                        : [...draft.talentTypes, option.value],
                    })
                  }
                  className={setupPill(selected)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {draft.currentStep === "styleFocus" ? (
          <div className="flex flex-wrap gap-2">
            {styleFocusOptions.map((option) => {
              const selected = draft.styleFocus.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    updateDraft({
                      styleFocus: selected
                        ? draft.styleFocus.filter((item) => item !== option.value)
                        : [...draft.styleFocus, option.value],
                    })
                  }
                  className={setupPill(selected)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {draft.currentStep === "markets" ? (
          <MarketSelector
            markets={draft.markets}
            onChange={(markets) => updateDraft({ markets })}
          />
        ) : null}

        {draft.currentStep === "verification" ? (
          <div className="grid gap-4">
            <AuthField label="Company website">
              <AuthInput
                value={draft.verificationLinks.companyWebsite ?? ""}
                onChange={(event) =>
                  updateDraft({
                    verificationLinks: {
                      ...draft.verificationLinks,
                      companyWebsite: event.target.value,
                    },
                  })
                }
                placeholder="https://"
              />
            </AuthField>
            <AuthField label="LinkedIn">
              <AuthInput
                value={draft.verificationLinks.linkedin ?? ""}
                onChange={(event) =>
                  updateDraft({
                    verificationLinks: {
                      ...draft.verificationLinks,
                      linkedin: event.target.value,
                    },
                  })
                }
                placeholder="https://linkedin.com/in/..."
              />
            </AuthField>
            <AuthField label="Instagram">
              <AuthInput
                value={draft.verificationLinks.instagram ?? ""}
                onChange={(event) =>
                  updateDraft({
                    verificationLinks: {
                      ...draft.verificationLinks,
                      instagram: event.target.value,
                    },
                  })
                }
                placeholder="https://instagram.com/..."
              />
            </AuthField>
          </div>
        ) : null}

        {draft.currentStep === "notifications" ? (
          <div className="space-y-3">
            {[
              {
                key: "newTalentMatches" as const,
                title: "New Talent Matches",
                description: "Profiles that fit your preferences.",
              },
              {
                key: "opportunityUpdates" as const,
                title: "Opportunity Updates",
                description: "Castings, classes, and sessions you follow.",
              },
              {
                key: "industryAnnouncements" as const,
                title: "Industry Announcements",
                description: "Product updates and Motiion news.",
              },
            ].map((item) => {
              const enabled = draft.notificationPreferences[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    updateDraft({
                      notificationPreferences: {
                        ...draft.notificationPreferences,
                        [item.key]: !enabled,
                      },
                    })
                  }
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                    enabled
                      ? "border-[var(--accent-dark)] bg-[color-mix(in_oklab,var(--accent),white_88%)]"
                      : "border-[var(--line)] bg-white"
                  }`}
                >
                  <div>
                    <p className="font-medium text-[var(--ink)]">{item.title}</p>
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">{item.description}</p>
                  </div>
                  <span
                    className={`inline-flex size-6 items-center justify-center rounded-full border ${
                      enabled
                        ? "border-[var(--accent-dark)] bg-[var(--accent-dark)] text-white"
                        : "border-[var(--line)] bg-white"
                    }`}
                  >
                    {enabled ? <Check className="size-3.5" /> : null}
                  </span>
                </button>
              );
            })}
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
                  disabled={isPending}
                  onCanceled={() => clearTalentBuyerDraft(profile.id)}
                  onError={setError}
                />
                {draft.currentStep !== "dateOfBirth" ? (
                  <button
                    type="button"
                    className="signup-split-nav-btn signup-split-nav-btn--ghost"
                    onClick={() => goToStep(getPreviousTalentBuyerStep(draft.currentStep))}
                    disabled={isPending}
                  >
                    <ChevronLeft className="size-4" />
                    Back
                  </button>
                ) : null}
              </div>
            ) : (
              <span />
            )}

            {draft.currentStep === "verification" ? (
              <div className="ml-auto flex items-center gap-3">
                <button
                  type="button"
                  className="signup-split-nav-btn"
                  onClick={handleSkipVerification}
                  disabled={isPending}
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  className="signup-split-submit !w-auto px-5"
                  onClick={handleContinue}
                  disabled={isPending}
                >
                  Continue
                  <ChevronRight className="ml-1 inline size-4" />
                </button>
              </div>
            ) : isSuccessStep ? (
              <button type="button" className="signup-split-submit ml-auto !w-auto px-5" onClick={handleDashboard}>
                Go to Dashboard
              </button>
            ) : (
              <button
                type="button"
                className="signup-split-submit ml-auto !w-auto px-5"
                onClick={handleContinue}
                disabled={isPending}
              >
                {isPending
                  ? "Saving…"
                  : draft.currentStep === "notifications"
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
