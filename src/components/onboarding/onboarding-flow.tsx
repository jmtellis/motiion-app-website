"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import {
  beginIndustryOnboarding,
  checkUsernameAvailability,
  completeOnboarding,
  syncOnboardingProfessionalDraft,
} from "@/app/onboarding/actions";
import {
  AuthButton,
  AuthInput,
} from "@/components/auth/ui";
import { SetupFlowCancelButton } from "@/components/auth/SetupFlowCancelButton";
import { SetupFlowFormPanel } from "@/components/auth/SetupFlowFormPanel";
import { SignupSplitShell } from "@/components/auth/SignupSplitShell";
import { HeadshotUploadGrid } from "@/components/onboarding/HeadshotUploadGrid";
import { HeightPicker } from "@/components/onboarding/HeightPicker";
import { RepresentationEditor } from "@/components/onboarding/RepresentationEditor";
import { ProfileSetupBenefits } from "./ProfileSetupBenefits";
import { BirthDateInput } from "./BirthDateInput";
import { initialProfileNames, normalizeProfileNames, updateProfileNames } from "@/lib/onboarding/names";
import { birthDateError } from "@/lib/onboarding/birth-date";
import { ButtonProgress } from "@/components/auth/ButtonProgress";
import { SizingEditor } from "@/components/onboarding/SizingEditor";
import { WorkingLocationsEditor } from "@/components/onboarding/WorkingLocationsEditor";
import type { TalentAgency } from "@/lib/agencies/fetch-talent-agencies";
import { BUYER_HOME_PATH } from "@/lib/talent-buyers/dashboard-data";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/lib/onboarding/draft-storage";
import {
  featuredInvitePath,
  readPendingFeaturedTalentInviteToken,
} from "@/lib/publicFeaturedTalentInvite";
import {
  getFlowProgress,
  getIndustryOnboardingPath,
  getNextStep,
  getOnboardingSteps,
  getPreviousStep,
  isCommunity,
  isTalent,
  needsPhysicalTalentFields,
  normalizeTalentTypes,
  talentSubtypeOptions,
} from "@/lib/onboarding/flow";
import { getSetupFlowShellProps } from "@/lib/setup-flow/config";
import { setupChoiceCard, setupPill } from "@/lib/setup-flow/form-styles";
import {
  accountCreatedCopy,
  acquisitionSourceOptions,
  type AcquisitionSource,
} from "@/lib/talent/copy";
import { styleOptions } from "@/lib/mock-data";
import type { DashboardProfile, TalentSubtype } from "@/types/database";
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

/**
 * Soft signup stubs default `account_type` to talent before the user answers
 * “What brings you to Motiion?” Only treat the lane as confirmed when the
 * profile has real subtype / community / hiring signals.
 */
function getConfirmedRole(profile: DashboardProfile): OnboardingRole | null {
  if (profile.accountType === "lookingForTalent" || profile.accountType === "looking_for_talent") {
    return "industry";
  }

  if (profile.accountType === "community") {
    return "community";
  }

  const talentTypes = normalizeTalentTypes(profile.talentTypes);
  if (profile.accountType === "talent" && talentTypes.length > 0) {
    return "talent";
  }

  return null;
}

function createInitialDraft(profile: DashboardProfile): OnboardingDraft {
  const { firstName, lastName, displayName } = initialProfileNames(profile.fullName);
  const confirmedRole = getConfirmedRole(profile);
  // Industry continues in talent-buyers flow; force role pick here.
  const role = confirmedRole === "industry" ? null : confirmedRole;
  const talentTypes = role === "talent" ? normalizeTalentTypes(profile.talentTypes) : [];

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
    accountType:
      role === "community" ? "community" : role === "talent" ? "talent" : null,
    talentTypes,
    displayName,
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
    acquisitionSource: "",
    acquisitionSourceDetail: "",
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
    title: "What brings you to Motiion?",
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
  howDidYouHear: {
    title: "How did you hear about Motiion?",
    subtitle: "This helps us understand where Motiion is growing.",
  },
  accountCreated: {
    title: accountCreatedCopy.chromeTitle,
    subtitle: accountCreatedCopy.body,
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

export function OnboardingFlow({
  profile,
  agencies,
  addingTalentShell = false,
}: {
  profile: DashboardProfile;
  agencies: TalentAgency[];
  addingTalentShell?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => {
    const loaded = addingTalentShell ? null : loadOnboardingDraft(profile.id);
    let base = loaded ?? createInitialDraft(profile);
    base = { ...base, ...normalizeProfileNames(base) };
    if (addingTalentShell) {
      base = {
        ...base,
        role: "talent",
        accountType: "talent",
        talentTypes: [],
        currentStep: "role",
      };
    } else if (base.role === "industry") {
      base = { ...base, role: null, accountType: null, talentTypes: [], currentStep: "role" };
    } else if (base.role === "talent" && base.talentTypes.length < 1) {
      base = { ...base, role: null, accountType: null, currentStep: "role" };
    }
    const steps = getOnboardingSteps(base.role);
    const currentStep = steps.includes(base.currentStep) ? base.currentStep : steps[0];
    return { ...base, currentStep };
  });
  const [error, setError] = useState<string | null>(null);
  const [headshotError, setHeadshotError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [finishingChoice, setFinishingChoice] = useState<boolean | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [usernameResult, setUsernameResult] = useState<{ username: string; available: boolean; message: string } | null>(null);
  const usernameValid = /^[a-z0-9_]{3,30}$/.test(draft.username);
  const usernameCurrent = usernameResult?.username === draft.username ? usernameResult : null;
  const usernameMessage = !usernameValid ? "Use 3–30 lowercase letters, numbers, or underscores." : usernameCurrent?.message ?? "Checking username…";
  const dateError = attempted || /^\d{4}-\d{2}-\d{2}$/.test(draft.dateOfBirth) ? birthDateError(draft.dateOfBirth) : null;
  useEffect(() => {
    if (draft.currentStep !== "profile" || !usernameValid) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(draft.username);
        if (active) setUsernameResult({ username: draft.username, available: result.available, message: result.message ?? "Unable to check username. Please try again." });
      } catch {
        if (active) setUsernameResult({ username: draft.username, available: false, message: "Unable to check username. Edit it to retry." });
      }
    }, 450);
    return () => { active = false; window.clearTimeout(timer); };
  }, [draft.username, draft.currentStep, usernameValid]);
  const [isPending, startTransition] = useTransition();
  const [stepDirection, setStepDirection] = useState<"forward" | "back">("forward");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      saveOnboardingDraft(draft);
      if (isTalent(draft.role)) {
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
    if (patch.username !== undefined) setUsernameResult(null);
    setDraft((current) => ({ ...current, ...patch, ...updateProfileNames(current, patch) }));
    setError(null);
  }

  function setRole(role: OnboardingRole) {
    updateDraft({
      role,
      accountType:
        role === "industry"
          ? "lookingForTalent"
          : role === "community"
            ? "community"
            : "talent",
      talentTypes: role === "talent" ? draft.talentTypes : [],
    });
  }

  function toggleTalentSubtype(subtype: TalentSubtype) {
    const selected = draft.talentTypes.includes(subtype);
    const talentTypes = selected
      ? draft.talentTypes.filter((item) => item !== subtype)
      : [...draft.talentTypes, subtype];
    updateDraft({
      role: "talent",
      accountType: "talent",
      talentTypes,
    });
  }

  function redirectToIndustry() {
    startTransition(async () => {
      const result = await beginIndustryOnboarding();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clearOnboardingDraft(profile.id);
      router.push(result.redirectTo || getIndustryOnboardingPath());
      router.refresh();
    });
  }

  function validateStep(step: OnboardingStep) {
    switch (step) {
      case "role":
        if (!draft.role) {
          return "Choose what brings you to Motiion.";
        }
        if (draft.role === "talent" && draft.talentTypes.length < 1) {
          return "Choose at least one talent type.";
        }
        return null;

      case "account":
        if (!draft.firstName.trim() || !draft.lastName.trim()) {
          return "First and last name are required.";
        }
        if (!draft.email.includes("@")) {
          return "Enter a valid email address.";
        }
        if (birthDateError(draft.dateOfBirth)) {
          return "You must be at least 18 to join Motiion.";
        }
        return null;

      case "profile":
        if (isTalent(draft.role) && draft.headshotUrls.length < 1) {
          return "Add at least one headshot.";
        }
        if (!draft.displayName.trim() || !/^[a-z0-9_]{3,30}$/.test(draft.username)) {
          return "Add a display name and a valid username.";
        }
        return null;

      case "howDidYouHear":
        if (!draft.acquisitionSource) {
          return "Choose how you heard about Motiion.";
        }
        return null;

      case "accountCreated":
        return null;

      default:
        return null;
    }
  }

  function goNext() {
    if (draft.currentStep === "role" && draft.role === "industry") {
      redirectToIndustry();
      return;
    }

    setAttempted(true);
    const stepError = validateStep(draft.currentStep);

    if (stepError) {
      if (!["account", "profile"].includes(draft.currentStep)) setError(stepError);
      return;
    }

    setAttempted(false);
    setStepDirection("forward");
    updateDraft({ currentStep: getNextStep(draft.currentStep, draft.role) });
  }

  function goBack() {
    setAttempted(false);
    setStepDirection("back");
    updateDraft({ currentStep: getPreviousStep(draft.currentStep, draft.role) });
  }

  function buildCompletePayload(openProfileSetupAfterComplete: boolean): CompleteOnboardingPayload {
    return { ...draft, openProfileSetupAfterComplete };
  }

  function finishAccount(openProfileSetupAfterComplete: boolean) {
    setFinishingChoice(openProfileSetupAfterComplete);
    const payload = buildCompletePayload(openProfileSetupAfterComplete);

    startTransition(async () => {
      const result = await completeOnboarding(payload);

      if (!result.ok) {
        if (result.error.toLowerCase().includes("username")) {
          setDraft(current => ({ ...current, currentStep: "profile" }));
          setUsernameResult({ username: draft.username, available: false, message: result.error });
        } else setError(result.error);
        return;
      }

      clearOnboardingDraft(profile.id);
      const featuredToken = readPendingFeaturedTalentInviteToken();
      router.push(
        featuredToken ? featuredInvitePath(featuredToken) : result.redirectTo,
      );
      router.refresh();
    });
  }


  function renderRoleSection() {
    const roleCards = (
      [
        ["talent", "Talent", "Build your career and find opportunities."],
        ["industry", "Industry Professional", "Cast, hire, and work with dance talent."],
        ["community", "Community Member", "Discover dancers, events, and stay connected."],
      ] as const
    ).filter(([role]) => !addingTalentShell || role === "talent");

    return (
      <div className="signup-split-choice-grid">
        {roleCards.map(([role, title, description]) => {
          const selected = draft.role === role;
          return (
            <div key={role}>
              <button
                type="button"
                onClick={() => setRole(role)}
                className={`${setupChoiceCard(selected)} w-full`}
                aria-pressed={selected}
                aria-controls={role === "talent" && selected ? "onboarding-talent-types" : undefined}
              >
                <span className="signup-split-choice__copy">
                  <span className="signup-split-choice__title">{title}</span>
                  <span className="signup-split-choice__description">{description}</span>
                </span>
                <span className="signup-split-choice__check" aria-hidden>
                  {selected ? <Check className="size-4" strokeWidth={2.5} /> : null}
                </span>
              </button>
              {role === "talent" && selected ? (
                <fieldset id="onboarding-talent-types" className="onboarding-talent-types">
                  <legend>What kind of talent are you?</legend>
                  <p id="onboarding-talent-types-help">Select all that apply. Choose at least one to continue.</p>
                  <div className="flex flex-wrap gap-2.5" aria-describedby="onboarding-talent-types-help">
                    {talentSubtypeOptions.map((option) => {
                      const checked = draft.talentTypes.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleTalentSubtype(option.value)}
                          className={setupPill(checked)}
                          aria-pressed={checked}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}
            </div>
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
            <AuthInput placeholder="First name" autoComplete="given-name" value={draft.firstName} onChange={(event) => updateDraft({ firstName: event.target.value })} />
            {attempted && !draft.firstName.trim() ? <span className="setup-field-error">First name is required.</span> : null}
          </Field>
          <Field label="Last name">
            <AuthInput placeholder="Last name" autoComplete="family-name" value={draft.lastName} onChange={(event) => updateDraft({ lastName: event.target.value })} />
            {attempted && !draft.lastName.trim() ? <span className="setup-field-error">Last name is required.</span> : null}
          </Field>
        </div>
        <Field label="Email">
          <AuthInput type="email" value={draft.email} onChange={(event) => updateDraft({ email: event.target.value })} />
          {attempted && !draft.email.includes("@") ? <span className="setup-field-error">Enter a valid email address.</span> : null}
        </Field>
        <Field label="Date of birth">
          <BirthDateInput value={draft.dateOfBirth} onChange={(dateOfBirth) => updateDraft({ dateOfBirth })} invalid={Boolean(dateError)} />
          <span id="birth-date-help" className={dateError ? "setup-field-error" : "setup-field-help"}>{dateError ?? "You must be 18 or older to join Motiion."}</span>
          <span id="birth-date-format" className="sr-only">Enter month, day, and four-digit year.</span>
        </Field>
      </div>
    );
  }

  function renderTalentProfileSection() {
    return (
      <div className="space-y-0">
        <SectionBlock title={isCommunity(draft.role) ? "Headshots (optional)" : "Headshots"}>
          <HeadshotUploadGrid
            headshotUrls={draft.headshotUrls}
            headshotOriginalUrls={draft.headshotOriginalUrls}
            onUploaded={(urls) => { updateDraft(urls); setHeadshotError(null); }}
            onError={setHeadshotError}
            onBusyChange={setUploading}
          />
          {headshotError || (attempted && isTalent(draft.role) && !draft.headshotUrls.length) ? <p role="alert" className="setup-field-error">{headshotError ?? "Add at least one headshot."}</p> : null}
        </SectionBlock>

        <SectionBlock title="Public profile">
          <div className="grid items-start gap-4 md:grid-cols-2">
            <Field label="Display name">
              <AuthInput value={draft.displayName} onChange={(event) => updateDraft({ displayName: event.target.value })} />
            {attempted && !draft.displayName.trim() ? <span className="setup-field-error">Display name is required.</span> : null}
            </Field>
            <Field label="Username">
              <AuthInput
                value={draft.username}
                onChange={(event) =>
                  updateDraft({ username: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })
                }
                aria-describedby="username-help"
                aria-invalid={Boolean(usernameCurrent && !usernameCurrent.available)}
              />
              <span id="username-help" role="status" className={usernameCurrent?.available ? "setup-field-success" : usernameCurrent || (!usernameValid && (draft.username || attempted)) ? "setup-field-error" : "setup-field-help"}>{usernameMessage}</span>
            </Field>

          </div>
        </SectionBlock>
      </div>
    );
  }

  function renderAttributesSection() {
    const showPhysical = needsPhysicalTalentFields(draft.talentTypes);

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
        {showPhysical ? (
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
    const showPhysical = needsPhysicalTalentFields(draft.talentTypes);

    return (
      <div className="space-y-0">
        {showPhysical ? (
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
    const showPhysical = needsPhysicalTalentFields(draft.talentTypes);

    return (
      <div className="space-y-0">
        <SectionBlock title="Styles">
          <TogglePills options={styleOptions} values={draft.styles} onChange={(styles) => updateDraft({ styles })} />
        </SectionBlock>

        {showPhysical ? (
          <SectionBlock title="Skills">
            <TogglePills options={skillOptions} values={draft.skills} onChange={(skills) => updateDraft({ skills })} />
          </SectionBlock>
        ) : null}

        {showPhysical ? (
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

  function renderHowDidYouHearSection() {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {acquisitionSourceOptions.map((option) => {
            const selected = draft.acquisitionSource === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={setupChoiceCard(selected)}
                onClick={() =>
                  updateDraft({ acquisitionSource: option.value as AcquisitionSource })
                }
              >
                <span className="font-medium">{option.label}</span>
                {selected ? <Check className="size-4 text-white" /> : null}
              </button>
            );
          })}
        </div>
        {draft.acquisitionSource === "other" ? (
          <Field label="Tell us more (optional)">
            <AuthInput
              value={draft.acquisitionSourceDetail}
              onChange={(event) =>
                updateDraft({ acquisitionSourceDetail: event.target.value })
              }
              placeholder="Where did you hear about us?"
            />
          </Field>
        ) : null}
      </div>
    );
  }

  function renderAccountCreatedSection() {
    return (
      <div className="space-y-6">
        <div className="onboarding-success-avatar relative mx-auto h-24 w-24">
          {/* Uploaded profile image; a decorative badge confirms the account state. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {draft.headshotUrls[0] ? <img src={draft.headshotUrls[0]} alt="Your profile photo" className="h-24 w-24 rounded-full object-cover"/> : <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-3xl">{draft.displayName.charAt(0)}</div>}
          <span className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-4 border-black bg-[#ffffff] text-[#111111]"><Check size={18}/></span>
        </div>
        <p className="onboarding-success-name">{draft.displayName}</p>
        <ProfileSetupBenefits />
        {isTalent(draft.role) ? (
          <p className="text-sm text-[var(--ink-soft)]">
            Your progress is saved. You can finish your profile anytime from Home.
          </p>
        ) : null}
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
        return renderTalentProfileSection();
      case "howDidYouHear":
        return renderHowDidYouHearSection();
      case "accountCreated":
        return renderAccountCreatedSection();
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
  const isAccountCreatedStep = draft.currentStep === "accountCreated";
  const canContinue =
    draft.currentStep !== "role" ||
    draft.role === "community" ||
    draft.role === "industry" ||
    (draft.role === "talent" && draft.talentTypes.length >= 1);
  const shellProps = getSetupFlowShellProps({
    audience: "talent",
    surface: "onboarding",
    microStep: draft.currentStep,
  });
  const currentCopy = talentStepCopy[draft.currentStep];
  const stepTitle =
    addingTalentShell && draft.currentStep === "role" ? "Add a talent profile" : currentCopy.title;
  const stepSubtitle =
    addingTalentShell && draft.currentStep === "role"
      ? "Choose the talent types you want people to hire you for."
      : currentCopy.subtitle;

  return (
    <SignupSplitShell
      {...shellProps}
      showWordmark
      fullBleed
      progressLabel={flowProgress.sectionTitle}
      progressCurrent={flowProgress.currentStep}
      progressTotal={draft.currentStep === "role" ? getOnboardingSteps("talent").length : flowProgress.totalSteps}
    >
      <SetupFlowFormPanel
        footerProgress
        progressCurrent={isAccountCreatedStep ? undefined : flowProgress.currentStep}
        progressTotal={draft.currentStep === "role" ? getOnboardingSteps("talent").length : flowProgress.totalSteps}
        progressLabel={flowProgress.sectionTitle}
        title={stepTitle}
        subtitle={stepSubtitle}
        error={error}
        stepKey={draft.currentStep}
        stepDirection={stepDirection}
        footer={
          <>
            <div className="signup-split-form__footer-start">
              {isFirstStep && !isAccountCreatedStep ? (
                <SetupFlowCancelButton
                  userId={profile.id}
                  disabled={isPending}
                  exitHref={addingTalentShell ? BUYER_HOME_PATH : undefined}
                  onCanceled={() => clearOnboardingDraft(profile.id)}
                  onError={setError}
                />
              ) : null}
              {!isFirstStep && !isAccountCreatedStep ? (
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


            {isAccountCreatedStep ? (
              <div className="signup-split-form__footer-end onboarding-completion-actions">
                {isTalent(draft.role) ? (
                  <button
                    type="button"
                    className="signup-split-nav-btn signup-split-nav-btn--ghost"
                    onClick={() => finishAccount(false)}
                    disabled={isPending}
                  >
                    <ButtonProgress loading={isPending && finishingChoice === false}>{accountCreatedCopy.secondary}</ButtonProgress>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="signup-split-submit !w-auto px-5"
                  onClick={() => finishAccount(isTalent(draft.role))}
                  disabled={isPending}
                >
                  <ButtonProgress loading={isPending && finishingChoice === isTalent(draft.role)}>{isTalent(draft.role) ? accountCreatedCopy.primary : "Enter Motiion"}</ButtonProgress>
                </button>
              </div>
            ) : (
              <div className="signup-split-form__footer-end">
                <button
                  type="button"
                  className="signup-split-continue"
                  onClick={goNext}
                  disabled={isPending || uploading || !canContinue || (draft.currentStep === "account" && Boolean(dateError)) || (draft.currentStep === "profile" && !usernameCurrent?.available)}
                >
                  <ButtonProgress loading={isPending}>Continue <ChevronRight className="size-4" strokeWidth={2.25} /></ButtonProgress>
                </button>
              </div>
            )}
          </>
        }
      >
        {renderStep()}

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
    [
      "Role",
      draft.role === "talent"
        ? `Talent (${draft.talentTypes.join(", ") || "none"})`
        : draft.role === "community"
          ? "Community Member"
          : draft.role === "industry"
            ? "Industry Professional"
            : "Not selected",
    ],
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
