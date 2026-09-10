"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  finishDeferredProfileSetup,
  persistDeferredProfileProgress,
  submitProfileForReviewAction,
} from "@/app/profile/setup/actions";
import { SetupFlowFormPanel } from "@/components/auth/SetupFlowFormPanel";
import { SignupSplitShell } from "@/components/auth/SignupSplitShell";
import { HeadshotUploadGrid } from "@/components/onboarding/HeadshotUploadGrid";
import { HeightPicker } from "@/components/onboarding/HeightPicker";
import { RepresentationEditor } from "@/components/onboarding/RepresentationEditor";
import { ResumeUploadField } from "@/components/onboarding/ResumeUploadField";
import { SizingEditor } from "@/components/onboarding/SizingEditor";
import { WorkingLocationsEditor } from "@/components/onboarding/WorkingLocationsEditor";
import type { TalentAgency } from "@/lib/agencies/fetch-talent-agencies";
import { styleOptions } from "@/lib/mock-data";
import { setupPill } from "@/lib/setup-flow/form-styles";
import { submitForReviewValueItems } from "@/lib/talent/copy";
import {
  acknowledgeSkip,
  deferredStepsOrdered,
  isSkippableStep,
  shouldSkipPhysicalTalentDetails,
  skipTitleForStep,
  type DeferredSetupStep,
  type TalentSetupProfile,
} from "@/lib/talent/profile-setup";
import type { TalentSubtype } from "@/types/database";

/** Match the iOS attributes chip screen the product ships with on web. */
const genderOptions = ["Woman", "Man", "Non-binary", "Prefer not to say", "Other"];
const ethnicityOptions = [
  "Asian",
  "Black / African descent",
  "Hispanic / Latine",
  "Middle Eastern / North African",
  "Native / Indigenous",
  "Pacific Islander",
  "White",
  "Multiracial",
  "Prefer not to say",
];
const hairColorOptions = ["Black", "Brown", "Blonde", "Red", "Gray", "White", "Other"];
const eyeColorOptions = ["Brown", "Blue", "Green", "Hazel", "Gray", "Other"];
const unionOptions = ["Non-union", "SAG-AFTRA", "AEA", "AGMA", "Other"];
const skillOptions = [
  "Ballet",
  "Contemporary",
  "Hip-Hop",
  "Jazz",
  "Tap",
  "Commercial",
  "Heels",
  "Breaking",
  "Afrobeats",
  "House",
];

const stepTitles: Record<DeferredSetupStep, { title: string; subtitle: string }> = {
  resumeImport: {
    title: "Import your resume",
    subtitle: "Optional — you can add credits manually later.",
  },
  profileIdentity: {
    title: "Confirm your name",
    subtitle: "This is how casting teams will see you.",
  },
  headshots: {
    title: "Headshots",
    subtitle: "Add clear photos so industry professionals recognize you.",
  },
  attributesMenu: {
    title: "Attributes",
    subtitle: "Help teams filter and find the right fit.",
  },
  talentSubtypes: {
    title: "Talent types",
    subtitle: "Choose every type that describes your work.",
  },
  sizing: {
    title: "Measurements",
    subtitle: "Add sizing so wardrobe teams can prepare.",
  },
  workingLocations: {
    title: "Working locations",
    subtitle: "Where can you work?",
  },
  representation: {
    title: "Representation",
    subtitle: "Make your professional relationships visible.",
  },
  unionStatus: {
    title: "Union status",
    subtitle: "Add your union affiliation if you have one.",
  },
  addStyles: {
    title: "Styles & genres",
    subtitle: "What kinds of work should Motiion match you with?",
  },
  addSkills: {
    title: "Skills",
    subtitle: "Highlight the skills casting teams search for.",
  },
  addCredits: {
    title: "Credits",
    subtitle: "Connect your profile to the work you've done.",
  },
  submitForReview: {
    title: "Submit for Motiion review",
    subtitle: "Get Motiion approved and appear where industry is looking.",
  },
};

type DraftState = Omit<TalentSetupProfile, "experiences"> & {
  headshotOriginalUrls: string[];
  experiences: Array<{
    title: string;
    role?: string;
    credits?: string;
    category?: string;
    start_date?: string;
    end_date?: string;
    notes?: string;
    link_url?: string;
  }>;
};

function toDraft(profile: TalentSetupProfile): DraftState {
  const experiences = Array.isArray(profile.experiences)
    ? profile.experiences.map((raw) => {
        const item = (raw ?? {}) as Record<string, unknown>;
        return {
          title: typeof item.title === "string" ? item.title : "",
          role: typeof item.role === "string" ? item.role : undefined,
          credits: typeof item.credits === "string" ? item.credits : undefined,
          category: typeof item.category === "string" ? item.category : undefined,
          start_date: typeof item.start_date === "string" ? item.start_date : undefined,
          end_date: typeof item.end_date === "string" ? item.end_date : undefined,
          notes: typeof item.notes === "string" ? item.notes : undefined,
          link_url: typeof item.link_url === "string" ? item.link_url : undefined,
        };
      })
    : [];

  return {
    ...profile,
    headshotOriginalUrls: profile.headshotOriginalUrls ?? [],
    skills: profile.skills ?? [],
    experiences,
    deferredSetupSkipped: profile.deferredSetupSkipped ?? {},
  };
}

function parseEthnicityList(value: string | null | undefined) {
  if (!value?.trim()) return [] as string[];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function serializeEthnicityList(values: string[]) {
  return values.join(", ");
}

export function ProfileSetupWizard({
  initialProfile,
  agencies,
}: {
  initialProfile: TalentSetupProfile;
  agencies: TalentAgency[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>(() => toDraft(initialProfile));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [stepDirection, setStepDirection] = useState<"forward" | "back">("forward");

  const [stepIndex, setStepIndex] = useState(0);
  const contentSteps = useMemo(() => {
    const skipPhysical = shouldSkipPhysicalTalentDetails(draft.talentTypes);
    const base = deferredStepsOrdered.filter((step) => {
      if (step === "submitForReview") return false;
      if (skipPhysical && (step === "sizing" || step === "addSkills")) return false;
      return true;
    });
    return base.length ? base : (["profileIdentity"] as DeferredSetupStep[]);
  }, [draft.talentTypes]);

  const [phase, setPhase] = useState<"content" | "submit">("content");
  const step: DeferredSetupStep =
    phase === "submit" ? "submitForReview" : contentSteps[Math.min(stepIndex, contentSteps.length - 1)]!;
  const copy = stepTitles[step];
  const progressCurrent = phase === "submit" ? contentSteps.length + 1 : stepIndex + 1;
  const progressTotal = contentSteps.length + 1;

  function updateDraft(patch: Partial<DraftState>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setError(null);
  }

  function persistAnd(next: () => void, skipped?: boolean) {
    startTransition(async () => {
      let deferredSetupSkipped = draft.deferredSetupSkipped ?? {};
      if (skipped) {
        deferredSetupSkipped = acknowledgeSkip(step, deferredSetupSkipped);
        updateDraft({ deferredSetupSkipped });
      }

      const result = await persistDeferredProfileProgress({
        firstName: draft.firstName ?? undefined,
        lastName: draft.lastName ?? undefined,
        displayName: draft.displayName ?? undefined,
        resumeUrl: draft.resumeUrl ?? null,
        headshotUrls: draft.headshotUrls ?? [],
        headshotOriginalUrls: draft.headshotOriginalUrls ?? [],
        talentTypes: (draft.talentTypes ?? []).filter((item): item is TalentSubtype =>
          ["dancer", "choreographer", "instructor"].includes(item),
        ),
        gender: draft.gender ?? null,
        ethnicity: draft.ethnicity ?? null,
        height: draft.height ?? null,
        hairColor: draft.hairColor ?? null,
        eyeColor: draft.eyeColor ?? null,
        sizing: draft.sizing ?? null,
        workingLocations: draft.workingLocations ?? [],
        representation: draft.representation ?? null,
        agent: draft.agent ?? null,
        unionStatus: draft.unionStatus ?? null,
        styles: draft.styles ?? [],
        skills: draft.skills ?? [],
        experiences: draft.experiences,
        deferredSetupSkipped,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      next();
    });
  }

  function goNext(skipped = false) {
    setStepDirection("forward");
    persistAnd(() => {
      if (stepIndex >= contentSteps.length - 1) {
        startTransition(async () => {
          const finish = await finishDeferredProfileSetup();
          if (!finish.ok) {
            setError(finish.error);
            return;
          }
          setPhase("submit");
        });
        return;
      }
      setStepIndex((value) => value + 1);
    }, skipped);
  }

  function goBack() {
    setStepDirection("back");
    if (phase === "submit") {
      setPhase("content");
      return;
    }
    setStepIndex((value) => Math.max(0, value - 1));
  }

  function finishLater() {
    startTransition(async () => {
      await finishDeferredProfileSetup();
      router.push("/home");
      router.refresh();
    });
  }

  function submitReview() {
    startTransition(async () => {
      const result = await submitProfileForReviewAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/home");
      router.refresh();
    });
  }

  const displayName =
    draft.displayName?.trim() ||
    [draft.firstName, draft.lastName].filter(Boolean).join(" ") ||
    "Your profile";

  const ethnicitySelected = parseEthnicityList(draft.ethnicity);
  const isFirstStep = phase === "content" && stepIndex === 0;

  return (
    <SignupSplitShell
      headline="Complete your profile"
      subtext="Add the details that help casting teams find you."
      steps={[]}
      showSteps={false}
      showNav={false}
      showWordmark={false}
      portraitCover={{
        imageUrl: draft.headshotUrls?.[0] ?? null,
        name: displayName,
      }}
      progressLabel="Complete Profile"
      progressCurrent={progressCurrent}
      progressTotal={progressTotal}
      coverAction={
        <button
          type="button"
          className="signup-split-nav-btn signup-split-nav-btn--ghost"
          onClick={finishLater}
          disabled={isPending}
        >
          Finish later
        </button>
      }
    >
      <SetupFlowFormPanel
        title={copy.title}
        subtitle={copy.subtitle}
        error={error}
        stepKey={`${phase}-${step}`}
        stepDirection={stepDirection}
        progressLabel="Complete Profile"
        progressCurrent={progressCurrent}
        progressTotal={progressTotal}
        footer={
          <>
            <div className="signup-split-form__footer-start">
              {!isFirstStep ? (
                <button
                  type="button"
                  className="signup-split-nav-btn signup-split-nav-btn--ghost"
                  onClick={goBack}
                  disabled={isPending}
                  aria-label="Previous step"
                >
                  <ChevronLeft className="size-4" />
                  Back
                </button>
              ) : null}
            </div>
            <span className="signup-split-form__footer-center" aria-hidden />
            <div className="signup-split-form__footer-end flex flex-wrap items-center justify-end gap-2">
              {phase === "submit" ? (
                <>
                  <button
                    type="button"
                    className="signup-split-nav-btn signup-split-nav-btn--ghost"
                    onClick={finishLater}
                    disabled={isPending}
                  >
                    {skipTitleForStep("submitForReview")}
                  </button>
                  <button
                    type="button"
                    className="signup-split-submit !w-auto px-5"
                    onClick={submitReview}
                    disabled={isPending}
                  >
                    {isPending ? "Submitting…" : "Submit"}
                  </button>
                </>
              ) : (
                <>
                  {isSkippableStep(step) ? (
                    <button
                      type="button"
                      className="signup-split-nav-btn signup-split-nav-btn--ghost"
                      onClick={() => goNext(true)}
                      disabled={isPending}
                    >
                      {skipTitleForStep(step)}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="signup-split-continue"
                    onClick={() => goNext(false)}
                    disabled={isPending}
                  >
                    Continue
                    <ChevronRight className="size-4" strokeWidth={2.25} />
                  </button>
                </>
              )}
            </div>
          </>
        }
      >
        {renderStep()}
      </SetupFlowFormPanel>
    </SignupSplitShell>
  );

  function toggleValue(list: string[] | null | undefined, value: string) {
    const current = list ?? [];
    return current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
  }

  function renderStep() {
    switch (step) {
      case "resumeImport":
        return (
          <ResumeUploadField
            resumeUrl={draft.resumeUrl ?? ""}
            onProcessed={(patch) =>
              updateDraft({
                resumeUrl: patch.resumeUrl ?? draft.resumeUrl,
                experiences: (patch.experiences as DraftState["experiences"]) ?? draft.experiences,
                styles: patch.styles ?? draft.styles,
                skills: patch.skills ?? draft.skills,
                height: patch.height ?? draft.height,
                gender: patch.gender ?? draft.gender,
                ethnicity: patch.ethnicity ?? draft.ethnicity,
                hairColor: patch.hairColor ?? draft.hairColor,
                eyeColor: patch.eyeColor ?? draft.eyeColor,
                sizing: patch.sizing ?? draft.sizing,
              })
            }
            onError={setError}
          />
        );
      case "profileIdentity":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="signup-split-field">
              <span>First name</span>
              <input
                value={draft.firstName ?? ""}
                onChange={(event) => updateDraft({ firstName: event.target.value })}
                autoComplete="given-name"
              />
            </label>
            <label className="signup-split-field">
              <span>Last name</span>
              <input
                value={draft.lastName ?? ""}
                onChange={(event) => updateDraft({ lastName: event.target.value })}
                autoComplete="family-name"
              />
            </label>
            <label className="signup-split-field sm:col-span-2">
              <span>Display name</span>
              <input
                value={draft.displayName ?? ""}
                onChange={(event) => updateDraft({ displayName: event.target.value })}
                autoComplete="nickname"
              />
            </label>
          </div>
        );
      case "headshots":
        return (
          <HeadshotUploadGrid
            headshotUrls={draft.headshotUrls ?? []}
            headshotOriginalUrls={draft.headshotOriginalUrls ?? []}
            onUploaded={({ headshotUrls, headshotOriginalUrls }) =>
              updateDraft({ headshotUrls, headshotOriginalUrls })
            }
            onError={setError}
          />
        );
      case "attributesMenu":
        return (
          <div className="space-y-6">
            <ChipGroup
              label="Gender"
              options={genderOptions}
              value={draft.gender ?? ""}
              onChange={(gender) => updateDraft({ gender })}
            />
            <MultiChipGroup
              label="Ethnicity"
              hint="Select all that apply."
              options={ethnicityOptions}
              values={ethnicitySelected}
              onChange={(values) => updateDraft({ ethnicity: serializeEthnicityList(values) })}
            />
            {!shouldSkipPhysicalTalentDetails(draft.talentTypes) ? (
              <>
                <HeightPicker
                  value={draft.height ?? ""}
                  onChange={(height) => updateDraft({ height })}
                />
                <ChipGroup
                  label="Hair color"
                  options={hairColorOptions}
                  value={draft.hairColor ?? ""}
                  onChange={(hairColor) => updateDraft({ hairColor })}
                />
                <ChipGroup
                  label="Eye color"
                  options={eyeColorOptions}
                  value={draft.eyeColor ?? ""}
                  onChange={(eyeColor) => updateDraft({ eyeColor })}
                />
              </>
            ) : null}
          </div>
        );
      case "talentSubtypes":
        return (
          <div className="space-y-3">
            <p className="text-sm text-[var(--ink-soft)]">Select all that apply.</p>
            <div className="flex flex-wrap gap-2.5">
              {(["dancer", "choreographer", "instructor"] as TalentSubtype[]).map((type) => {
                const selected = (draft.talentTypes ?? []).includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    className={setupPill(selected)}
                    aria-pressed={selected}
                    onClick={() =>
                      updateDraft({
                        talentTypes: toggleValue(draft.talentTypes, type),
                      })
                    }
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case "sizing":
        return (
          <SizingEditor value={draft.sizing ?? ""} onChange={(sizing) => updateDraft({ sizing })} />
        );
      case "workingLocations":
        return (
          <WorkingLocationsEditor
            locations={draft.workingLocations ?? []}
            onChange={(workingLocations) => updateDraft({ workingLocations })}
          />
        );
      case "representation":
        return (
          <RepresentationEditor
            agencies={agencies}
            representation={draft.representation ?? ""}
            agent={draft.agent ?? ""}
            additionalRepresentations={[]}
            onChange={({ representation, agent }) => updateDraft({ representation, agent })}
          />
        );
      case "unionStatus":
        return (
          <ChipGroup
            label="Union status"
            options={unionOptions}
            value={draft.unionStatus ?? ""}
            onChange={(unionStatus) => updateDraft({ unionStatus })}
          />
        );
      case "addStyles":
        return (
          <MultiChipGroup
            label="Styles"
            options={styleOptions}
            values={draft.styles ?? []}
            onChange={(styles) => updateDraft({ styles })}
          />
        );
      case "addSkills":
        return (
          <MultiChipGroup
            label="Skills"
            options={skillOptions}
            values={draft.skills ?? []}
            onChange={(skills) => updateDraft({ skills })}
          />
        );
      case "addCredits":
        return (
          <div className="space-y-3">
            {(draft.experiences ?? []).map((item, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-[var(--ds-radius-md)] border border-[var(--line)] bg-[var(--tone)] p-4 sm:grid-cols-2"
              >
                <label className="signup-split-field">
                  <span>Title</span>
                  <input
                    value={item.title}
                    onChange={(event) => {
                      const experiences = [...(draft.experiences ?? [])];
                      experiences[index] = { ...item, title: event.target.value };
                      updateDraft({ experiences });
                    }}
                  />
                </label>
                <label className="signup-split-field">
                  <span>Role</span>
                  <input
                    value={item.role ?? ""}
                    onChange={(event) => {
                      const experiences = [...(draft.experiences ?? [])];
                      experiences[index] = { ...item, role: event.target.value };
                      updateDraft({ experiences });
                    }}
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              className="signup-split-text-btn signup-split-text-btn--accent"
              onClick={() =>
                updateDraft({
                  experiences: [...(draft.experiences ?? []), { title: "", role: "" }],
                })
              }
            >
              Add credit
            </button>
          </div>
        );
      case "submitForReview":
        return (
          <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[16px] border border-[var(--line)]">
            {submitForReviewValueItems.map((item) => (
              <li key={item} className="px-4 py-3.5 text-sm text-[var(--ink)]">
                {item}
              </li>
            ))}
          </ul>
        );
      default:
        return null;
    }
  }
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-[var(--ink)]">{label}</p>
      <div className="flex flex-wrap gap-2.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={setupPill(value === option)}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiChipGroup({
  label,
  hint,
  options,
  values,
  onChange,
}: {
  label: string;
  hint?: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-[var(--ink)]">{label}</p>
        {hint ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{hint}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={setupPill(selected)}
              aria-pressed={selected}
              onClick={() =>
                onChange(selected ? values.filter((item) => item !== option) : [...values, option])
              }
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
