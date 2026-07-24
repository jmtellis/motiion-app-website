"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ComponentType, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  ClipboardList,
  Compass,
  Ellipsis,
  Handshake,
  Palette,
  Pencil,
  PersonStanding,
  Search,
  UsersRound,
} from "lucide-react";

import {
  completeTalentBuyerOnboarding,
  saveTalentBuyerOnboardingProgress,
} from "@/app/talent-buyers/onboarding/actions";
import { SetupFlowCancelButton } from "@/components/auth/SetupFlowCancelButton";
import { SetupFlowFormPanel } from "@/components/auth/SetupFlowFormPanel";
import { SignupSplitShell } from "@/components/auth/SignupSplitShell";
import { AuthField, AuthInput } from "@/components/auth/ui";
import { SetupFieldBlock } from "@/components/auth/SetupFieldBlock";
import { MarketPlacesSelector } from "@/components/talent-buyers/MarketPlacesSelector";
import { OrganizationPicker } from "@/components/talent-buyers/OrganizationPicker";
import { IndustryOnboardingCompletePricing } from "@/components/talent-buyers/IndustryOnboardingCompletePricing";
import { trackClientEvent } from "@/lib/analytics/track-client";
import { startIndustryCheckout } from "@/lib/billing/actions";
import { getSetupFlowShellProps } from "@/lib/setup-flow/config";
import { setupChoiceCard, setupMultiChoiceCard, setupPill } from "@/lib/setup-flow/form-styles";
import {
  clearTalentBuyerDraft,
  loadTalentBuyerDraft,
  saveTalentBuyerDraft,
} from "@/lib/talent-buyers/draft-storage";
import {
  defaultBuyerNotificationPreferences,
  getNextTalentBuyerStep,
  getPreviousTalentBuyerStep,
  getTalentBuyerFlowProgress,
  mapLegacyPrimaryGoalToPlatformGoals,
  marketsFromPlaces,
  platformGoalOptions,
  resolveIndustryPrimaryAction,
  roleOptions,
  shouldShowWorkTypeFollowUp,
  togglePlatformGoal,
  toggleWorkType,
  validateTalentBuyerStep,
  workTypeOptions,
} from "@/lib/talent-buyers/onboarding";
import { normalizeBuyerRole } from "@/lib/talent-buyers/roles";
import type { DashboardProfile } from "@/types/database";
import type {
  TalentBuyerMarketPlace,
  TalentBuyerOnboardingDraft,
  TalentBuyerOnboardingStep,
  TalentBuyerOrganizationRelationship,
  TalentBuyerPlatformGoal,
  TalentBuyerRole,
  TalentBuyerWorkType,
} from "@/types/talent-buyers";

const roleIcons: Record<
  (typeof roleOptions)[number]["value"],
  ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  choreographer: PersonStanding,
  casting_professional: Clapperboard,
  creative_director_or_producer: Palette,
  talent_representative: Handshake,
  brand_or_agency_professional: Building2,
  other: Ellipsis,
};

const platformGoalIcons: Record<
  TalentBuyerPlatformGoal,
  ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  find_dancers: Search,
  run_a_casting: Clapperboard,
  manage_talent: UsersRound,
  build_a_roster: ClipboardList,
  staff_a_project: Briefcase,
  coordinate_bookings: CalendarCheck,
  just_exploring: Compass,
};

function createInitialDraft(profile: DashboardProfile): TalentBuyerOnboardingDraft {
  const normalizedRole = normalizeBuyerRole(profile.buyerRole);
  const platformGoals =
    profile.platformGoals?.length
      ? profile.platformGoals
      : mapLegacyPrimaryGoalToPlatformGoals(profile.primaryGoal);

  const step =
    (profile.onboardingStep as TalentBuyerOnboardingStep | null) &&
    ["professionalContext", "goalsAndWork", "organizationAndMarket", "success"].includes(
      profile.onboardingStep ?? "",
    )
      ? (profile.onboardingStep as TalentBuyerOnboardingStep)
      : "professionalContext";

  return {
    version: 3,
    userId: profile.id,
    currentStep: step === "success" ? "professionalContext" : step,
    fullName: profile.fullName ?? "",
    contactEmail: profile.email ?? "",
    role: normalizedRole,
    customRole: profile.customRole ?? "",
    platformGoals,
    workTypes: profile.workTypes ?? [],
    customWorkType: profile.customWorkType ?? "",
    organizationRelationship: profile.organizationRelationship ?? "",
    organizationName: profile.organizationName ?? profile.companyName ?? "",
    organizationWebsite: profile.organizationWebsite ?? "",
    organizationBrandDomain: profile.organizationBrandDomain ?? "",
    markets: profile.markets ?? [],
    marketPlaces: profile.marketPlaces ?? [],
    notificationPreferences: {
      ...defaultBuyerNotificationPreferences,
      ...(profile.notificationPreferences ?? {}),
    },
  };
}

const stepCopy: Record<TalentBuyerOnboardingStep, { title: string; subtitle?: string }> = {
  professionalContext: {
    title: "Let’s get you hiring.",
    subtitle: "What best describes your role?",
  },
  goalsAndWork: {
    title: "What do you need help with?",
    subtitle: "Select all that apply.",
  },
  organizationAndMarket: {
    title: "How do you work?",
    subtitle: "So talent knows who’s reaching out.",
  },
  success: {
    title: "Your workspace is ready.",
    subtitle: "Start free, or try Pro free for 60 days.",
  },
};

function ChoiceGrid({ children }: { children: ReactNode }) {
  return <div className="signup-split-choice-grid">{children}</div>;
}

export function TalentBuyerOnboardingFlow({ profile }: { profile: DashboardProfile }) {
  const router = useRouter();
  const startedRef = useRef(false);
  const [draft, setDraft] = useState<TalentBuyerOnboardingDraft>(() => {
    const initial = createInitialDraft(profile);
    const saved = loadTalentBuyerDraft(profile.id);
    return saved ? { ...initial, ...saved, version: 3, userId: profile.id } : initial;
  });
  const [organizationImageUrl, setOrganizationImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingMode, setPendingMode] = useState<"free" | "trial" | null>(null);
  const [stepDirection, setStepDirection] = useState<"forward" | "back">("forward");

  const progress = useMemo(() => getTalentBuyerFlowProgress(draft.currentStep), [draft.currentStep]);
  const isSuccessStep = draft.currentStep === "success";
  const firstStep: TalentBuyerOnboardingStep = "professionalContext";
  const nameMissing = !(profile.fullName ?? "").trim() || profile.fullName === "Motiion User";
  const emailMissing = !(profile.email ?? "").trim();
  const showNameField = nameMissing || !draft.fullName.trim();
  const showEmailField = emailMissing || !draft.contactEmail.trim();
  const showWorkTypes = shouldShowWorkTypeFollowUp(draft.platformGoals);
  const primaryAction = resolveIndustryPrimaryAction(draft.platformGoals);

  const canContinue = useMemo(() => {
    return !validateTalentBuyerStep(draft.currentStep, draft);
  }, [draft]);

  useEffect(() => {
    saveTalentBuyerDraft(draft);
  }, [draft]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackClientEvent("industry_onboarding_started", { step: draft.currentStep });
    trackClientEvent("industry_onboarding_step_viewed", { step: draft.currentStep });
  }, [draft.currentStep]);

  useEffect(() => {
    if (!isSuccessStep) return;
    trackClientEvent("paywall_viewed", { feature: "industry_onboarding_complete" });
  }, [isSuccessStep]);

  function updateDraft(partial: Partial<TalentBuyerOnboardingDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function setMarketPlaces(marketPlaces: TalentBuyerMarketPlace[]) {
    updateDraft({
      marketPlaces,
      markets: marketsFromPlaces(marketPlaces),
    });
  }

  function goToStep(step: TalentBuyerOnboardingStep, direction: "forward" | "back" = "forward") {
    setStepDirection(direction);
    updateDraft({ currentStep: step });
    setError(null);
    trackClientEvent(
      direction === "back" ? "industry_onboarding_back_clicked" : "industry_onboarding_step_viewed",
      { step },
    );
  }

  function persistProgress(nextDraft: TalentBuyerOnboardingDraft) {
    void saveTalentBuyerOnboardingProgress(nextDraft);
  }

  function handleContinue() {
    const validationError = validateTalentBuyerStep(draft.currentStep, draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    trackClientEvent("industry_onboarding_step_completed", {
      step: draft.currentStep,
      role: draft.role || undefined,
      platform_goals: draft.platformGoals,
      work_types: draft.workTypes,
      organization_relationship: draft.organizationRelationship || undefined,
    });

    const nextStep = getNextTalentBuyerStep(draft.currentStep);
    const nextDraft = { ...draft, currentStep: nextStep };
    persistProgress(nextDraft);
    goToStep(nextStep);
  }

  function buildCompletionPayload(): TalentBuyerOnboardingDraft {
    return {
      ...draft,
      version: 3,
      markets: marketsFromPlaces(draft.marketPlaces),
      notificationPreferences: {
        ...defaultBuyerNotificationPreferences,
        ...draft.notificationPreferences,
      },
    };
  }

  function handleContinueFree() {
    setPendingMode("free");
    setError(null);
    startTransition(async () => {
      const result = await completeTalentBuyerOnboarding(buildCompletionPayload());
      if (!result.ok) {
        setError(result.error);
        setPendingMode(null);
        return;
      }
      clearTalentBuyerDraft(profile.id);
      trackClientEvent("industry_onboarding_primary_action_clicked", {
        primary_action: primaryAction.id,
        href: primaryAction.href,
      });
      router.push(result.redirectTo || primaryAction.href);
      router.refresh();
    });
  }

  function handleStartTrial() {
    setPendingMode("trial");
    setError(null);
    startTransition(async () => {
      const result = await completeTalentBuyerOnboarding(buildCompletionPayload());
      if (!result.ok) {
        setError(result.error);
        setPendingMode(null);
        return;
      }
      clearTalentBuyerDraft(profile.id);
      trackClientEvent("paywall_cta_tapped", { plan: "industry_pro" });
      const checkout = await startIndustryCheckout();
      if (checkout.url) {
        window.location.href = checkout.url;
        return;
      }
      setError(checkout.error ?? "Could not start checkout. Try again.");
      setPendingMode(null);
    });
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
        {draft.currentStep === "professionalContext" ? (
          <div className="grid gap-5">
            {showNameField ? (
              <AuthField label="Full name">
                <AuthInput
                  value={draft.fullName}
                  onChange={(event) => updateDraft({ fullName: event.target.value })}
                  placeholder="First and last name"
                  autoComplete="name"
                />
              </AuthField>
            ) : null}
            {showEmailField ? (
              <AuthField label="Work email">
                <AuthInput
                  type="email"
                  value={draft.contactEmail}
                  onChange={(event) => updateDraft({ contactEmail: event.target.value })}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </AuthField>
            ) : null}

            <div>
              <ChoiceGrid>
                {roleOptions.map((option) => {
                  const selected = draft.role === option.value;
                  const Icon = roleIcons[option.value];
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateDraft({
                          role: option.value,
                          customRole: option.value === "other" ? draft.customRole : "",
                        })
                      }
                      className={setupChoiceCard(selected)}
                      aria-pressed={selected}
                    >
                      <span className="signup-split-choice__icon" aria-hidden>
                        <Icon className="size-4" />
                      </span>
                      <span className="signup-split-choice__copy">
                        <span className="signup-split-choice__title">{option.label}</span>
                      </span>
                      <span className="signup-split-choice__check" aria-hidden>
                        {selected ? <Check className="size-4" strokeWidth={2.5} /> : null}
                      </span>
                    </button>
                  );
                })}
              </ChoiceGrid>
            </div>

            {draft.role === "other" ? (
              <AuthField label="Your role">
                <AuthInput
                  value={draft.customRole}
                  onChange={(event) => updateDraft({ customRole: event.target.value })}
                  placeholder="e.g. Movement director"
                />
              </AuthField>
            ) : null}
          </div>
        ) : null}

        {draft.currentStep === "goalsAndWork" ? (
          <div className="grid gap-5">
            <ChoiceGrid>
              {platformGoalOptions.map((option) => {
                const selected = draft.platformGoals.includes(option.value);
                const Icon = platformGoalIcons[option.value];
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const nextGoals = togglePlatformGoal(draft.platformGoals, option.value);
                      updateDraft({
                        platformGoals: nextGoals,
                        // Clear work types when the follow-up no longer applies.
                        workTypes: shouldShowWorkTypeFollowUp(nextGoals) ? draft.workTypes : [],
                        customWorkType: shouldShowWorkTypeFollowUp(nextGoals)
                          ? draft.customWorkType
                          : "",
                      });
                    }}
                    className={setupMultiChoiceCard(selected)}
                    aria-pressed={selected}
                  >
                    <span className="signup-split-choice__icon" aria-hidden>
                      <Icon className="size-4" />
                    </span>
                    <span className="signup-split-choice__copy">
                      <span className="signup-split-choice__title">{option.title}</span>
                      <span className="signup-split-choice__description">{option.description}</span>
                    </span>
                    <span className="signup-split-choice__check" aria-hidden>
                      {selected ? <Check className="size-4" strokeWidth={2.5} /> : null}
                    </span>
                  </button>
                );
              })}
            </ChoiceGrid>
          </div>
        ) : null}

        {draft.currentStep === "organizationAndMarket" ? (
          <div className="signup-split-stack signup-split-stack--loose">
            <OrganizationPicker
              relationship={draft.organizationRelationship}
              organizationName={draft.organizationName}
              organizationWebsite={draft.organizationWebsite}
              organizationBrandDomain={draft.organizationBrandDomain}
              organizationImageUrl={organizationImageUrl}
              onRelationshipChange={(value: TalentBuyerOrganizationRelationship) =>
                updateDraft({ organizationRelationship: value })
              }
              onOrganizationChange={(value) => {
                updateDraft({
                  organizationName: value.name,
                  organizationWebsite: value.website,
                  organizationBrandDomain: value.brandDomain,
                });
                setOrganizationImageUrl(value.imageUrl ?? null);
              }}
            />

            {showWorkTypes ? (
              <>
                <hr className="signup-split-fade-rule" />
                <SetupFieldBlock
                  label="What kind of work are you hiring for?"
                  hint="Optional"
                >
                  <div className="grid gap-3">
                    <div className="flex flex-wrap gap-2.5">
                      {workTypeOptions.map((option) => {
                        const selected = draft.workTypes.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              const next = toggleWorkType(draft.workTypes, option.value);
                              updateDraft({
                                workTypes: next,
                                customWorkType: next.includes("other") ? draft.customWorkType : "",
                              });
                            }}
                            className={setupPill(selected)}
                            aria-pressed={selected}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    {draft.workTypes.includes("other") ? (
                      <AuthField label="Other work type">
                        <AuthInput
                          value={draft.customWorkType}
                          onChange={(event) => updateDraft({ customWorkType: event.target.value })}
                          placeholder="Describe the work"
                        />
                      </AuthField>
                    ) : null}
                  </div>
                </SetupFieldBlock>
              </>
            ) : null}

            <hr className="signup-split-fade-rule" />
            <MarketPlacesSelector
              places={draft.marketPlaces}
              onChange={setMarketPlaces}
              maxPlaces={1}
            />
          </div>
        ) : null}
      </>
    );
  }

  if (isSuccessStep) {
    return (
      <SignupSplitShell {...shellProps} fullBleed coverAction={null}>
        <div className="industry-onboarding-complete">
          <IndustryOnboardingCompletePricing
            title={currentCopy.title}
            subtitle={currentCopy.subtitle}
            error={error}
            pending={isPending}
            pendingMode={pendingMode}
            onContinueFree={handleContinueFree}
            onStartTrial={handleStartTrial}
          />
        </div>
      </SignupSplitShell>
    );
  }

  return (
    <SignupSplitShell
      {...shellProps}
      progressLabel={progress.sectionTitle}
      progressCurrent={progress.currentStep}
      progressTotal={progress.totalSteps}
      coverAction={
        <SetupFlowCancelButton
          userId={profile.id}
          disabled={isPending}
          onCanceled={() => {
            trackClientEvent("industry_onboarding_abandoned", { step: draft.currentStep });
            clearTalentBuyerDraft(profile.id);
          }}
          onError={setError}
        />
      }
    >
      <SetupFlowFormPanel
        title={currentCopy.title}
        subtitle={currentCopy.subtitle}
        error={error}
        stepKey={draft.currentStep}
        stepDirection={stepDirection}
        footer={
          <>
            <div className="signup-split-form__footer-start">
              {draft.currentStep === firstStep && draft.fullName.trim() && !showNameField ? (
                <p className="signup-split-form__footer-identity">
                  {draft.fullName.trim()}
                  {draft.contactEmail.trim() ? ` · ${draft.contactEmail.trim()}` : ""}
                </p>
              ) : null}
              {draft.currentStep !== firstStep ? (
                <button
                  type="button"
                  className="signup-split-nav-btn signup-split-nav-btn--ghost"
                  onClick={() => goToStep(getPreviousTalentBuyerStep(draft.currentStep), "back")}
                  disabled={isPending}
                >
                  <ChevronLeft className="size-4" />
                  Back
                </button>
              ) : null}
            </div>

            <span className="signup-split-form__footer-center" aria-hidden />

            <div className="signup-split-form__footer-end">
              <button
                type="button"
                className="signup-split-continue"
                onClick={handleContinue}
                disabled={isPending || !canContinue}
              >
                Continue
                <ChevronRight className="size-4" strokeWidth={2.25} />
              </button>
            </div>
          </>
        }
      >
        {renderStepFields()}
      </SetupFlowFormPanel>
    </SignupSplitShell>
  );
}

// Re-export helpers used by tests / consumers that previously imported from this file context.
export type { TalentBuyerRole, TalentBuyerPlatformGoal, TalentBuyerWorkType };
