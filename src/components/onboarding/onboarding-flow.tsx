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
  talentSetupValueItems,
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

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

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
  const { firstName, lastName } = splitName(profile.fullName);
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
    let base = loaded ?? createInitialDraft(profile);
    // Industry always routes out; never resume mid-draft as industry here.
    if (base.role === "industry") {
      base = { ...base, role: null, accountType: null, talentTypes: [], currentStep: "role" };
    }
    // Stale drafts from when signup pre-selected talent without subtypes.
    if (base.role === "talent" && base.talentTypes.length < 1) {
      base = { ...base, role: null, accountType: null, currentStep: "role" };
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
    setDraft((current) => ({ ...current, ...patch }));
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
        if (!draft.dateOfBirth || getAge(draft.dateOfBirth) < 18) {
          return "You must be at least 18 to join Motiion.";
        }
        return null;

      case "profile":
        if (isTalent(draft.role) && draft.headshotUrls.length < 1) {
          return "Add at least one headshot URL.";
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

  function buildCompletePayload(openProfileSetupAfterComplete: boolean): CompleteOnboardingPayload {
    return { ...draft, openProfileSetupAfterComplete };
  }

  function finishAccount(openProfileSetupAfterComplete: boolean) {
    const payload = buildCompletePayload(openProfileSetupAfterComplete);

    startTransition(async () => {
      const result = await completeOnboarding(payload);

      if (!result.ok) {
        setError(result.error);
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

  function checkUsername() {
    setUsernameMessage("Checking username...");
    startTransition(async () => {
      const result = await checkUsernameAvailability(draft.username);
      setUsernameMessage(result.message ?? (result.available ? "Available." : "Unavailable."));
    });
  }

  function renderRoleSection() {
    const roleCards = [
      [
        "talent",
        "Talent",
        "Build your career and find opportunities.",
      ],
      [
        "industry",
        "Industry Professional",
        "Cast, hire, and work with dance talent.",
      ],
      [
        "community",
        "Community Member",
        "Discover dancers, events, and stay connected.",
      ],
    ] as const;

    return (
      <div className="space-y-6">
        <div className="signup-split-choice-grid">
          {roleCards.map(([role, title, description]) => {
            const selected = draft.role === role;

            return (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setRole(role);
                }}
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

        {draft.role === "talent" ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--ink-soft)]">Select all that apply.</p>
            <div className="flex flex-wrap gap-2.5">
              {talentSubtypeOptions.map((option) => {
                const selected = draft.talentTypes.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleTalentSubtype(option.value)}
                    className={setupPill(selected)}
                    aria-pressed={selected}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
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
        <SectionBlock title={isCommunity(draft.role) ? "Headshots (optional)" : "Headshots"}>
          <HeadshotUploadGrid
            headshotUrls={draft.headshotUrls}
            headshotOriginalUrls={draft.headshotOriginalUrls}
            onUploaded={(urls) => updateDraft(urls)}
            onError={setError}
          />
        </SectionBlock>

        {isTalent(draft.role) ? (
          <SectionBlock title="Resume">
            <ResumeUploadField
              resumeUrl={draft.resumeUrl}
              onProcessed={(patch) => updateDraft(patch)}
              onError={setError}
            />
          </SectionBlock>
        ) : null}

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
                {selected ? <Check className="size-4 text-[var(--accent)]" /> : null}
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
        <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--ds-radius-card)] border border-[var(--line)]">
          {talentSetupValueItems.map((item) => (
            <li key={item} className="px-4 py-3.5 text-sm text-[var(--ink)]">
              {item}
            </li>
          ))}
        </ul>
        {isTalent(draft.role) ? (
          <p className="text-sm text-[var(--ink-soft)]">
            You can finish setting up your profile anytime from Home. Progress you&apos;ve already
            saved will be kept.
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

            {isAccountCreatedStep ? (
              <div className="signup-split-form__footer-end flex flex-wrap items-center justify-end gap-2">
                {isTalent(draft.role) ? (
                  <button
                    type="button"
                    className="signup-split-nav-btn signup-split-nav-btn--ghost"
                    onClick={() => finishAccount(false)}
                    disabled={isPending}
                  >
                    {accountCreatedCopy.secondary}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="signup-split-submit !w-auto px-5"
                  onClick={() => finishAccount(isTalent(draft.role))}
                  disabled={isPending}
                >
                  {isPending
                    ? "Finishing…"
                    : isTalent(draft.role)
                      ? accountCreatedCopy.primary
                      : "Enter Motiion"}
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
