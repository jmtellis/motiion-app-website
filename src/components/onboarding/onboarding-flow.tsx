"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import {
  checkUsernameAvailability,
  completeOnboarding,
} from "@/app/onboarding/actions";
import {
  AuthButton,
  AuthCard,
  AuthCardContent,
  AuthField,
  AuthInput,
  AuthTextArea,
} from "@/components/auth/ui";
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
  const role = getInitialRole(profile);

  return {
    version: 1,
    userId: profile.id,
    currentStep: "account",
    firstName,
    lastName,
    email: profile.email ?? "",
    dateOfBirth: "",
    notificationsEnabled: false,
    role,
    accountType: role === "hiring" ? "lookingForTalent" : role ? "talent" : null,
    talentTypes: role && role !== "hiring" ? [role] : [],
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
    <label className="space-y-2">
      <span className="text-sm text-[var(--ink-soft)]">{label}</span>
      {children}
    </label>
  );
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-[var(--line)] pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-sm font-semibold tracking-tight text-[var(--ink)]">{title}</h2>
      {children}
    </section>
  );
}

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
      className="min-h-28 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-soft)] focus:border-white/20"
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
        className="h-11 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)] outline-none transition focus:border-white/20"
      >
        <option value="" className="bg-white">
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-white">
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
    <div className="flex flex-wrap gap-2">
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
            className={`rounded-full border px-4 py-2 text-sm transition ${
              isSelected
                ? "border-[var(--accent)] bg-[var(--accent)]/12 text-[var(--ink)]"
                : "border-[var(--line)] bg-white text-[var(--ink-soft)] hover:bg-[var(--tone)]"
            }`}
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
  const [draft, setDraft] = useState(
    () => loadOnboardingDraft(profile.id) ?? createInitialDraft(profile),
  );
  const [error, setError] = useState<string | null>(null);
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timeout = window.setTimeout(() => saveOnboardingDraft(draft), 300);
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
    const nextSteps = getOnboardingSteps(role);
    const currentStep = nextSteps.includes(draft.currentStep) ? draft.currentStep : "account";

    updateDraft({
      role,
      accountType: role === "hiring" ? "lookingForTalent" : "talent",
      talentTypes: role === "hiring" ? [] : [role],
      currentStep,
    });
  }

  function validateStep(step: OnboardingStep) {
    switch (step) {
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
        if (!draft.role) {
          return "Choose how you plan to use Motiion.";
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

    updateDraft({ currentStep: getNextStep(draft.currentStep, draft.role) });
  }

  function goBack() {
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

  function renderAccountSection() {
    return (
      <div className="space-y-0">
        <SectionBlock title="Your name">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="First name">
              <AuthInput value={draft.firstName} onChange={(event) => updateDraft({ firstName: event.target.value })} />
            </Field>
            <Field label="Last name">
              <AuthInput value={draft.lastName} onChange={(event) => updateDraft({ lastName: event.target.value })} />
            </Field>
          </div>
        </SectionBlock>

        <SectionBlock title="Contact">
          <Field label="Email">
            <AuthInput type="email" value={draft.email} onChange={(event) => updateDraft({ email: event.target.value })} />
          </Field>
        </SectionBlock>

        <SectionBlock title="Date of birth">
          <Field label="Date of birth">
            <AuthInput type="date" value={draft.dateOfBirth} onChange={(event) => updateDraft({ dateOfBirth: event.target.value })} />
          </Field>
        </SectionBlock>

        <SectionBlock title="How you use Motiion">
          <div className="grid gap-3 md:grid-cols-3">
            {(
              [
                ["dancer", "Dancer", "Build a performer profile for discovery and opportunities."],
                ["choreographer", "Choreographer", "Show creative work and manage casting workflows."],
                ["hiring", "Looking for talent", "Search, organize, and manage talent for projects."],
              ] as const
            ).map(([role, title, description]) => (
              <button
                key={role}
                type="button"
                onClick={() => setRole(role)}
                className={`rounded-[24px] border p-5 text-left transition ${
                  draft.role === role
                    ? "border-[var(--accent)] bg-[var(--accent)]/12"
                    : "border-[var(--line)] bg-white hover:bg-[var(--tone)]"
                }`}
              >
                <span className="block text-lg font-semibold text-[var(--ink)]">{title}</span>
                <span className="mt-2 block text-sm text-[var(--ink-soft)]">{description}</span>
              </button>
            ))}
          </div>
        </SectionBlock>
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

  const navIconButtonClass =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--ink)] transition-colors hover:bg-[var(--tone)] disabled:pointer-events-none disabled:opacity-35";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div className="space-y-4 px-1">
        <p className="text-center text-xs font-medium tracking-wide text-[var(--ink-soft)]">
          {flowProgress.sectionTitle}
        </p>

        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={goBack}
            disabled={isFirstStep || isPending}
            aria-label="Previous step"
            className={navIconButtonClass}
          >
            <ChevronLeft className="size-5" strokeWidth={2} aria-hidden />
          </button>

          <div
            className="w-full min-w-0 max-w-md"
            role="progressbar"
            aria-valuenow={flowProgress.currentStep}
            aria-valuemin={1}
            aria-valuemax={flowProgress.totalSteps}
            aria-label={`Step ${flowProgress.currentStep} of ${flowProgress.totalSteps}: ${flowProgress.sectionTitle}`}
          >
            <div className="h-1 overflow-hidden rounded-full bg-[var(--line)]">
              <div
                className="h-full rounded-full bg-[var(--ink)]/35 transition-[width] duration-300 ease-out"
                style={{ width: `${flowProgress.percent}%` }}
              />
            </div>
          </div>

          {isReviewStep ? (
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              aria-label={isPending ? "Finishing setup" : "Finish setup"}
              className={navIconButtonClass}
            >
              <Check className="size-5" strokeWidth={2} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={isPending}
              aria-label="Next step"
              className={navIconButtonClass}
            >
              <ChevronRight className="size-5" strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
      </div>

      <AuthCard>
        <AuthCardContent className="space-y-6">
          {renderStep()}
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}
        </AuthCardContent>
      </AuthCard>
    </div>
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
        <div key={label} className="rounded-2xl border border-[var(--line)] bg-[var(--tone)] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]">{label}</p>
          <p className="mt-1 text-sm text-[var(--ink)]">{value}</p>
        </div>
      ))}
    </div>
  );
}
