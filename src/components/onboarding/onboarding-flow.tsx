"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import {
  checkUsernameAvailability,
  completeOnboarding,
  syncOnboardingProfessionalDraft,
} from "@/app/onboarding/actions";
import {
  AuthButton,
  AuthField,
  AuthInput,
  AuthTextArea,
} from "@/components/auth/ui";
import { SetupFlowCancelButton } from "@/components/auth/SetupFlowCancelButton";
import { SetupFlowFormPanel } from "@/components/auth/SetupFlowFormPanel";
import { SignupSplitShell } from "@/components/auth/SignupSplitShell";
import { HeadshotUploadGrid } from "@/components/onboarding/HeadshotUploadGrid";
import { HeightPicker } from "@/components/onboarding/HeightPicker";
import { RepresentationEditor } from "@/components/onboarding/RepresentationEditor";
import { ResumeUploadField } from "@/components/onboarding/ResumeUploadField";
import { SizingEditor } from "@/components/onboarding/SizingEditor";
import { WorkingLocationsEditor } from "@/components/onboarding/WorkingLocationsEditor";
import type { TalentAgency } from "@/lib/agencies/fetch-talent-agencies";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/lib/onboarding/draft-storage";
import {
  getFlowProgress,
  getNextStep,
  getOnboardingSteps,
  getPreviousStep,
  isChoreographer,
  isHiring,
} from "@/lib/onboarding/flow";
import { getSetupFlowShellProps } from "@/lib/setup-flow/config";
import { setupChoiceCard, setupPill } from "@/lib/setup-flow/form-styles";
import { nonTalentSubtypeOptions, styleOptions } from "@/lib/mock-data";
import type { DashboardProfile, NonTalentSubtype } from "@/types/database";
import type {
  CompleteOnboardingPayload,
  OnboardingDraft,
  OnboardingRole,
  OnboardingStep,
} from "@/types/onboarding";

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
  "Partnering",
  "Improvisation",
  "On-camera",
  "Teaching",
  "Staging",
  "Casting support",
  "Movement direction",
  "Freestyle",
];

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function getInitialRole(profile: DashboardProfile): OnboardingRole | null {
  if (profile.accountType === "lookingForTalent" || profile.accountType === "looking_for_talent") {
    return "hiring";
  }

  if (profile.talentTypes?.some((type) => type.toLowerCase() === "choreographer")) {
    return "choreographer";
  }

  if (profile.accountType === "talent") {
    return "dancer";
  }

  return null;
}

function createInitialDraft(profile: DashboardProfile): OnboardingDraft {
  const { firstName, lastName } = splitName(profile.fullName);
  const initialRole = getInitialRole(profile);
  const role = initialRole === "hiring" ? null : initialRole;

  return {
    version: 1,
    userId: profile.id,
    currentStep: role ? "account" : "role",
    firstName,
    lastName,
    email: profile.email ?? "",
    dateOfBirth: "",
    notificationsEnabled: false,
    role,
    accountType: role ? "talent" : null,
    talentTypes: role ? [role] : [],
    displayName: profile.fullName === "Motiion User" ? "" : profile.fullName,
    username: "",
    headshotUrls: [],
    headshotOriginalUrls: [],
    resumeUrl: "",
    gender: "",
    ethnicity: "",
    height: "",
    hairColor: "",
    eyeColor: "",
    sizing: "",
    workingLocations: [],
    representation: "",
    unionStatus: "",
    unionMemberId: "",
    agent: "",
    additionalRepresentations: [],
    styles: [],
    skills: [],
    training: [],
    experiences: [],
    profileHighlights: [],
    instagramUrl: "",
    xUrl: "",
    tiktokUrl: "",
    whatsappUrl: "",
    youtubeUrl: "",
    companyName: profile.companyName ?? "",
    nonTalentType: profile.nonTalentType ?? "",
    hiringBio: "",
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-[var(--line)] pt-6 first:border-t-0 first:pt-0">
      <h2 className="setup-flow-section-title">{title}</h2>
      {children}
    </section>
  );
}

const talentStepCopy: Record<
  OnboardingStep,
  { title: string; subtitle?: string }
> = {
  role: {
    title: "How will you use Motiion?",
    subtitle: "Choose one to continue. You can refine your profile in the next steps.",
  },
  account: {
    title: "Confirm your details",
    subtitle: "We'll use this to set up your talent profile.",
  },
  profile: {
    title: "Your profile",
    subtitle: "Add photos and the basics casting teams need.",
  },
  attributes: {
    title: "Attributes",
    subtitle: "Optional details that help teams filter and find you.",
  },
  workDetails: {
    title: "Work details",
    subtitle: "Where you work, representation, and availability.",
  },
  experience: {
    title: "Experience",
    subtitle: "Styles, skills, training, and credits.",
  },
  review: {
    title: "Review your profile",
    subtitle: "Make sure everything looks right before you finish.",
  },
};

function TextArea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-28 w-full rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface-card)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-soft)] focus:border-[rgb(17_17_17_/_0.35)]"
    />
  );
}

function SelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-full border border-[var(--line)] bg-[var(--surface-card)] px-4 text-sm text-[var(--ink)] outline-none transition focus:border-[rgb(17_17_17_/_0.35)]"
      >
        <option value="" className="bg-[var(--surface-card)]">
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[var(--surface-card)]">
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function TogglePills({
  options,
  values,
  onChange,
}: {
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((option) => {
        const isSelected = values.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() =>
              onChange(
                isSelected
                  ? values.filter((value) => value !== option)
                  : [...values, option],
              )
            }
            className={setupPill(isSelected)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAge(dateOfBirth: string) {
  const birthDate = new Date(dateOfBirth);

  if (Number.isNaN(birthDate.getTime())) {
    return 0;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}

export function OnboardingFlow({
  profile,
  agencies,
}: {
  profile: DashboardProfile;
  agencies: TalentAgency[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => {
    const loaded = loadOnboardingDraft(profile.id);
    const base = loaded ?? createInitialDraft(profile);
    if (base.role === "hiring") {
      return { ...base, role: null, accountType: null, talentTypes: [], currentStep: "role" as const };
    }
    const steps = getOnboardingSteps(base.role);
    const currentStep = steps.includes(base.currentStep) ? base.currentStep : steps[0];
    return { ...base, currentStep };
  });
  const [error, setError] = useState<string | null>(null);
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [stepDirection, setStepDirection] = useState<"forward" | "back">("forward");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      saveOnboardingDraft(draft);
      if (draft.role !== "hiring") {
        void syncOnboardingProfessionalDraft({
          styles: draft.styles,
          skills: draft.skills,
          gender: draft.gender || null,
          ethnicity: draft.ethnicity || null,
          height: draft.height || null,
          unionStatus: draft.unionStatus || null,
          workingLocations: draft.workingLocations,
          instagramUrl: draft.instagramUrl || null,
          tiktokUrl: draft.tiktokUrl || null,
          username: draft.username || null,
          availability: "available",
        });
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [draft]);

  const steps = useMemo(() => getOnboardingSteps(draft.role), [draft.role]);
  const stepIndex = Math.max(0, steps.indexOf(draft.currentStep));
  const flowProgress = useMemo(
    () => getFlowProgress(draft.currentStep, draft.role),
    [draft.currentStep, draft.role],
  );

  function updateDraft(patch: Partial<OnboardingDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function setRole(role: OnboardingRole) {
    updateDraft({
      role,
      accountType: role === "hiring" ? "lookingForTalent" : "talent",
      talentTypes: role === "hiring" ? [] : [role],
    });
  }

  function validateStep(step: OnboardingStep) {
    switch (step) {
      case "role":
        if (!draft.role || draft.role === "hiring") {
          return "Choose how you plan to use Motiion.";
        }
        return null;

      case "account":
        if (!draft.firstName.trim() || !draft.lastName.trim()) {
          return "First and last name are required.";
        }
        if (!draft.email.includes("@")) {
          return "Enter a valid email address.";
        }
        if (!draft.dateOfBirth || getAge(draft.dateOfBirth) < 18) {
          return "You must be at least 18 to join Motiion.";
        }
        return null;

      case "profile":
        if (isHiring(draft.role)) {
          if (!draft.companyName.trim() || !draft.nonTalentType) {
            return "Add your organization and user type.";
          }
          return null;
        }

        if (draft.headshotUrls.length < 1) {
          return "Add at least one headshot URL.";
        }
        if (!draft.displayName.trim() || !/^[a-z0-9_]{3,30}$/.test(draft.username)) {
          return "Add a display name and a valid username.";
        }
        return null;

      case "workDetails":
        if (draft.workingLocations.length < 1) {
          return "Add at least one working location.";
        }
        return null;

      case "experience":
        if (draft.styles.length < 1) {
          return "Choose at least one style.";
        }
        if (draft.experiences.length < 1) {
          return "Add at least one credit or experience.";
        }
        return null;

      default:
        return null;
    }
  }

  function goNext() {
    const stepError = validateStep(draft.currentStep);

    if (stepError) {
      setError(stepError);
      return;
    }

    setStepDirection("forward");
    updateDraft({ currentStep: getNextStep(draft.currentStep, draft.role) });
  }

  function goBack() {
    setStepDirection("back");
    updateDraft({ currentStep: getPreviousStep(draft.currentStep, draft.role) });
  }

  function buildCompletePayload(): CompleteOnboardingPayload {
    if (!draft.role) {
      return draft as CompleteOnboardingPayload;
    }

    if (draft.role === "hiring") {
      const usernameBase =
        draft.username ||
        draft.companyName
          .toLowerCase()
          .replace(/[^a-z0-9_]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 24);

      return {
        ...draft,
        role: "hiring",
        displayName: draft.companyName.trim() || draft.displayName,
        username: usernameBase.length >= 3 ? usernameBase : `team_${draft.userId.replace(/-/g, "").slice(0, 8)}`,
      };
    }

    return draft as CompleteOnboardingPayload;
  }

  function submit() {
    const payload = buildCompletePayload();

    startTransition(async () => {
      const result = await completeOnboarding(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      clearOnboardingDraft(profile.id);
      router.push(result.redirectTo);
      router.refresh();
    });
  }

  function checkUsername() {
    setUsernameMessage("Checking username...");
    startTransition(async () => {
      const result = await checkUsernameAvailability(draft.username);
      setUsernameMessage(result.message ?? (result.available ? "Available." : "Unavailable."));
    });
  }

  function renderRoleSection() {
    return (
      <div className="signup-split-choice-grid">
        {(
          [
            ["dancer", "Dancer", "Build a performer profile for discovery and opportunities."],
            ["choreographer", "Choreographer", "Show creative work and manage casting workflows."],
          ] as const
        ).map(([role, title, description]) => {
          const selected = draft.role === role;

          return (
            <button
              key={role}
              type="button"
              onClick={() => setRole(role)}
              className={setupChoiceCard(selected)}
              aria-pressed={selected}
            >
              <span className="signup-split-choice__copy">
                <span className="signup-split-choice__title">{title}</span>
                <span className="signup-split-choice__description">{description}</span>
              </span>
              <span className="signup-split-choice__check" aria-hidden>
                {selected ? <Check className="size-4" strokeWidth={2.5} /> : null}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderAccountSection() {
    return (
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="First name">
            <AuthInput value={draft.firstName} onChange={(event) => updateDraft({ firstName: event.target.value })} />
          </Field>
          <Field label="Last name">
            <AuthInput value={draft.lastName} onChange={(event) => updateDraft({ lastName: event.target.value })} />
          </Field>
        </div>
        <Field label="Email">
          <AuthInput type="email" value={draft.email} onChange={(event) => updateDraft({ email: event.target.value })} />
        </Field>
        <Field label="Date of birth">
          <AuthInput type="date" value={draft.dateOfBirth} onChange={(event) => updateDraft({ dateOfBirth: event.target.value })} />
        </Field>
      </div>
    );
  }

  function renderTalentProfileSection() {
    return (
      <div className="space-y-0">
        <SectionBlock title="Headshots">
          <HeadshotUploadGrid
            headshotUrls={draft.headshotUrls}
            headshotOriginalUrls={draft.headshotOriginalUrls}
            onUploaded={(urls) => updateDraft(urls)}
            onError={setError}
          />
        </SectionBlock>

        <SectionBlock title="Resume">
          <ResumeUploadField
            resumeUrl={draft.resumeUrl}
            onProcessed={(patch) => updateDraft(patch)}
            onError={setError}
          />
        </SectionBlock>

        <SectionBlock title="Public profile">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Field label="Display name">
              <AuthInput value={draft.displayName} onChange={(event) => updateDraft({ displayName: event.target.value })} />
            </Field>
            <Field label="Username">
              <AuthInput
                value={draft.username}
                onChange={(event) =>
                  updateDraft({ username: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })
                }
              />
            </Field>
            <AuthButton type="button" variant="secondary" onClick={checkUsername} disabled={isPending || !draft.username}>
              Check
            </AuthButton>
            {usernameMessage ? <p className="text-sm text-[var(--ink-soft)] md:col-span-3">{usernameMessage}</p> : null}
          </div>
        </SectionBlock>
      </div>
    );
  }

  function renderHiringProfileSection() {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Company / organization">
          <AuthInput value={draft.companyName} onChange={(event) => updateDraft({ companyName: event.target.value })} />
        </Field>
        <SelectField
          label="User type"
          value={draft.nonTalentType}
          placeholder="Choose user type"
          options={nonTalentSubtypeOptions}
          onChange={(value) => updateDraft({ nonTalentType: value as NonTalentSubtype })}
        />
        <div className="md:col-span-2">
          <Field label="Bio">
            <TextArea
              value={draft.hiringBio}
              onChange={(hiringBio) => updateDraft({ hiringBio })}
              placeholder="Tell talent what kind of work your team casts or manages."
            />
          </Field>
        </div>
      </div>
    );
  }

  function renderAttributesSection() {
    const choreographer = isChoreographer(draft.role);

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Gender"
          value={draft.gender}
          placeholder="Choose gender"
          options={genderOptions.map((value) => ({ label: value, value }))}
          onChange={(gender) => updateDraft({ gender })}
        />
        <SelectField
          label="Ethnicity"
          value={draft.ethnicity}
          placeholder="Choose ethnicity"
          options={ethnicityOptions.map((value) => ({ label: value, value }))}
          onChange={(ethnicity) => updateDraft({ ethnicity })}
        />
        {!choreographer ? (
          <>
            <div className="md:col-span-2">
              <HeightPicker value={draft.height} onChange={(height) => updateDraft({ height })} />
            </div>
            <SelectField
              label="Hair color"
              value={draft.hairColor}
              placeholder="Choose hair color"
              options={hairColorOptions.map((value) => ({ label: value, value }))}
              onChange={(hairColor) => updateDraft({ hairColor })}
            />
            <SelectField
              label="Eye color"
              value={draft.eyeColor}
              placeholder="Choose eye color"
              options={eyeColorOptions.map((value) => ({ label: value, value }))}
              onChange={(eyeColor) => updateDraft({ eyeColor })}
            />
          </>
        ) : null}
      </div>
    );
  }

  function renderWorkDetailsSection() {
    const choreographer = isChoreographer(draft.role);

    return (
      <div className="space-y-0">
        {!choreographer ? (
          <SectionBlock title="Sizing">
            <SizingEditor value={draft.sizing} onChange={(sizing) => updateDraft({ sizing })} />
          </SectionBlock>
        ) : null}

        <SectionBlock title="Locations">
          <WorkingLocationsEditor
            locations={draft.workingLocations}
            onChange={(workingLocations) =>
              updateDraft({
                workingLocations: workingLocations.filter((item) => item.trim()),
              })
            }
          />
        </SectionBlock>

        <SectionBlock title="Representation">
          <RepresentationEditor
            representation={draft.representation}
            agent={draft.agent}
            additionalRepresentations={draft.additionalRepresentations}
            agencies={agencies}
            onChange={(patch) => updateDraft(patch)}
          />
        </SectionBlock>

        <SectionBlock title="Union">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Union status"
              value={draft.unionStatus}
              placeholder="Choose status"
              options={unionOptions.map((value) => ({ label: value, value }))}
              onChange={(unionStatus) => updateDraft({ unionStatus })}
            />
            <Field label="Union member ID">
              <AuthInput
                value={draft.unionMemberId}
                onChange={(event) => updateDraft({ unionMemberId: event.target.value })}
                placeholder="Optional"
              />
            </Field>
          </div>
        </SectionBlock>
      </div>
    );
  }

  function renderExperienceSection() {
    const choreographer = isChoreographer(draft.role);

    return (
      <div className="space-y-0">
        <SectionBlock title="Styles">
          <TogglePills options={styleOptions} values={draft.styles} onChange={(styles) => updateDraft({ styles })} />
        </SectionBlock>

        {!choreographer ? (
          <SectionBlock title="Skills">
            <TogglePills options={skillOptions} values={draft.skills} onChange={(skills) => updateDraft({ skills })} />
          </SectionBlock>
        ) : null}

        {!choreographer ? (
          <SectionBlock title="Training">
            <ListEditor
              label="Training"
              items={draft.training}
              emptyItem={{ name: "", program: "", start_year: "", end_year: "", notes: "" }}
              renderSummary={(item) => item.name || "Untitled training"}
              onChange={(training) => updateDraft({ training })}
            />
          </SectionBlock>
        ) : null}

        <SectionBlock title="Credits">
          <ListEditor
            label="Credits and experience"
            items={draft.experiences}
            emptyItem={{ title: "", role: "", credits: "", category: "", start_date: "", end_date: "", notes: "" }}
            renderSummary={(item) => item.title || "Untitled credit"}
            onChange={(experiences) => updateDraft({ experiences })}
          />
        </SectionBlock>
      </div>
    );
  }

  function renderStep() {
    switch (draft.currentStep) {
      case "role":
        return renderRoleSection();
      case "account":
        return renderAccountSection();
      case "profile":
        return isHiring(draft.role) ? renderHiringProfileSection() : renderTalentProfileSection();
      case "attributes":
        return renderAttributesSection();
      case "workDetails":
        return renderWorkDetailsSection();
      case "experience":
        return renderExperienceSection();
      case "review":
        return <ReviewPanel draft={draft} />;
      default:
        return null;
    }
  }

  const isFirstStep = stepIndex === 0;
  const isReviewStep = draft.currentStep === "review";
  const canContinue =
    draft.currentStep !== "role" || (draft.role !== null && draft.role !== "hiring");
  const shellProps = getSetupFlowShellProps({
    audience: "talent",
    surface: "onboarding",
    microStep: draft.currentStep,
  });
  const currentCopy = talentStepCopy[draft.currentStep];

  return (
    <SignupSplitShell
      {...shellProps}
      progressLabel={flowProgress.sectionTitle}
      progressCurrent={flowProgress.currentStep}
      progressTotal={flowProgress.totalSteps}
      coverAction={
        <SetupFlowCancelButton
          userId={profile.id}
          disabled={isPending}
          onCanceled={() => clearOnboardingDraft(profile.id)}
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

            {isReviewStep ? (
              <div className="signup-split-form__footer-end">
                <button
                  type="button"
                  className="signup-split-submit !w-auto px-5"
                  onClick={submit}
                  disabled={isPending}
                >
                  {isPending ? "Finishing…" : "Finish setup"}
                </button>
              </div>
            ) : (
              <div className="signup-split-form__footer-end">
                <button
                  type="button"
                  className="signup-split-continue"
                  onClick={goNext}
                  disabled={isPending || !canContinue}
                >
                  Continue
                  <ChevronRight className="size-4" strokeWidth={2.25} />
                </button>
              </div>
            )}
          </>
        }
      >
        {renderStep()}
        {usernameMessage ? (
          <p className="text-sm text-[var(--ink-soft)]">{usernameMessage}</p>
        ) : null}
      </SetupFlowFormPanel>
    </SignupSplitShell>
  );
}

function ListEditor<T extends Record<string, string | undefined>>({
  label,
  items,
  emptyItem,
  renderSummary,
  onChange,
}: {
  label: string;
  items: T[];
  emptyItem: T;
  renderSummary: (item: T) => string;
  onChange: (items: T[]) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--ink-soft)]">{label}</p>
        <AuthButton type="button" variant="secondary" className="!px-4 !py-2 text-xs" onClick={() => onChange([...items, emptyItem])}>
          Add
        </AuthButton>
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-[24px] border border-[var(--line)] bg-[var(--tone)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-semibold text-[var(--ink)]">{renderSummary(item)}</p>
                <AuthButton
                  type="button"
                  variant="ghost"
                  className="!px-3 !py-1.5 text-xs"
                  onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Remove
                </AuthButton>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.keys(emptyItem).map((key) => (
                  <Field key={key} label={key.replace(/_/g, " ")}>
                    <AuthInput
                      value={item[key] ?? ""}
                      onChange={(event) => {
                        const next = [...items];
                        next[index] = { ...item, [key]: event.target.value };
                        onChange(next);
                      }}
                    />
                  </Field>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--tone)] p-6 text-sm text-[var(--ink-soft)]">
          Add at least one entry to continue.
        </div>
      )}
    </div>
  );
}

function ReviewPanel({ draft }: { draft: OnboardingDraft }) {
  const rows = [
    ["Role", draft.role ?? "Not selected"],
    ["Name", `${draft.firstName} ${draft.lastName}`.trim()],
    ["Email", draft.email],
    ["Display", draft.displayName || "Not set"],
    ["Username", draft.username || "Not set"],
    ["Locations", draft.workingLocations.join(", ") || "Not set"],
    ["Styles", draft.styles.join(", ") || "Not set"],
    ["Skills", draft.skills.join(", ") || "Not set"],
    ["Headshots", `${draft.headshotUrls.length} added`],
    ["Credits", `${draft.experiences.length} added`],
    ["Training", `${draft.training.length} added`],
    ["Company", draft.companyName || "Not applicable"],
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--tone)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">{label}</p>
          <p className="mt-1 text-sm text-[var(--ink)]">{value}</p>
        </div>
      ))}
    </div>
  );
}
