"use client";

import { Check, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { persistDeferredProfileProgress } from "@/app/profile/setup/actions";
import { HeightPicker } from "@/components/onboarding/HeightPicker";
import { RepresentationEditor } from "@/components/onboarding/RepresentationEditor";
import { WorkingLocationsEditor } from "@/components/onboarding/WorkingLocationsEditor";
import type { TalentAgency } from "@/lib/agencies/fetch-talent-agencies";
import {
  blankTrainingEntry,
  parseEthnicityList,
  serializeEthnicityList,
  trainingTypeOptions,
  type PortfolioEditorDraft,
  type PortfolioSocials,
  type PortfolioTrainingEntry,
} from "@/lib/app/portfolio-editor";
import {
  ethnicityOptions,
  eyeColorOptions,
  genderOptions,
  hairColorOptions,
  skillOptions,
  styleOptions,
} from "@/lib/onboarding/profile-options";

type ProfileTab = "about" | "work" | "attributes";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "about", label: "About" },
  { id: "work", label: "Work details" },
  { id: "attributes", label: "Attributes" },
];

const unionOptions = ["SAG-AFTRA", "Non-union"];
const SEARCHABLE_OPTION_COUNT = 16;

const socialFields: { key: keyof PortfolioSocials; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/you" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@you" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@you" },
  { key: "x", label: "X", placeholder: "https://x.com/you" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/15551234567" },
];

export function PortfolioProfileTabs({
  editor,
  agencies,
}: {
  editor: PortfolioEditorDraft;
  agencies: TalentAgency[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>("about");
  const [baseline, setBaseline] = useState(editor);
  const [draft, setDraft] = useState(editor);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!saved) return;
    const timeout = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  function update(patch: Partial<PortfolioEditorDraft>) {
    setSaved(false);
    setDraft((current) => ({ ...current, ...patch }));
  }

  function discard() {
    setDraft(baseline);
    setError(null);
    setRevision((value) => value + 1);
  }

  function save() {
    const displayName = draft.displayName.trim();
    if (!displayName) {
      setTab("about");
      setError("Add a display name before saving.");
      return;
    }

    setError(null);
    const snapshot = draft;
    startTransition(async () => {
      const training = snapshot.training.flatMap((entry) => {
        const name = entry.name.trim() || entry.program.trim();
        if (!name) return [];
        return [
          {
            ...entry.extras,
            id: entry.id,
            name,
            program: entry.program.trim() || null,
            startDate: entry.startDate.trim() || null,
            endDate: entry.endDate.trim() || null,
            trainingType: entry.trainingType.trim() || null,
            sourceId: entry.sourceId,
            linkedTalentId: entry.linkedTalentId,
          },
        ];
      });

      const result = await persistDeferredProfileProgress({
        displayName,
        gender: snapshot.gender.trim() || null,
        ethnicity: snapshot.ethnicity.trim() || null,
        height: snapshot.height.trim() || null,
        hairColor: snapshot.hairColor.trim() || null,
        eyeColor: snapshot.eyeColor.trim() || null,
        workingLocations: snapshot.workingLocations.map((item) => item.trim()).filter(Boolean),
        representation: snapshot.representation.trim() || null,
        agent: (snapshot.agent.trim() || snapshot.representation.trim()) || null,
        additionalRepresentations: snapshot.additionalRepresentations.map((item) => item.trim()).filter(Boolean),
        unionStatus: snapshot.unionStatus.trim() || null,
        unionMemberId: snapshot.unionStatus === "SAG-AFTRA" ? snapshot.unionMemberId.trim() || null : null,
        styles: snapshot.styles,
        skills: snapshot.skills,
        training,
        instagramUrl: snapshot.socials.instagram.trim() || null,
        xUrl: snapshot.socials.x.trim() || null,
        tiktokUrl: snapshot.socials.tiktok.trim() || null,
        whatsappUrl: snapshot.socials.whatsapp.trim() || null,
        youtubeUrl: snapshot.socials.youtube.trim() || null,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setBaseline(snapshot);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <section className="portfolio-details" aria-label="Profile details">
      <div className="portfolio-tabs" role="tablist" aria-label="Profile details">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="portfolio-editor" role="tabpanel" key={`${revision}-${tab}`}>
        {tab === "about" ? (
          <AboutFields
            draft={draft}
            onDisplayName={(displayName) => update({ displayName })}
            onSocial={(key, value) => update({ socials: { ...draft.socials, [key]: value } })}
          />
        ) : null}
        {tab === "work" ? <WorkFields draft={draft} agencies={agencies} onChange={update} /> : null}
        {tab === "attributes" ? <AttributeFields draft={draft} onChange={update} /> : null}
      </div>

      {dirty || error || saved ? (
        <div className="portfolio-savebar" role="status" data-state={error ? "error" : dirty ? "dirty" : "saved"}>
          {error ? (
            <p>{error}</p>
          ) : !dirty ? (
            <p>
              <Check size={16} aria-hidden /> Changes saved
            </p>
          ) : null}
          {dirty ? (
            <>
              <button type="button" className="portfolio-savebar__discard" onClick={discard} disabled={isPending}>
                Discard
              </button>
              <button type="button" className="bd-btn-primary" onClick={save} disabled={isPending}>
                {isPending ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="portfolio-savebar__close"
              aria-label="Dismiss"
              onClick={() => {
                setSaved(false);
                setError(null);
              }}
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}

function AboutFields({
  draft,
  onDisplayName,
  onSocial,
}: {
  draft: PortfolioEditorDraft;
  onDisplayName: (value: string) => void;
  onSocial: (key: keyof PortfolioSocials, value: string) => void;
}) {
  const [shown, setShown] = useState<(keyof PortfolioSocials)[]>(() =>
    socialFields.filter((field) => draft.socials[field.key].trim()).map((field) => field.key),
  );
  const [focusKey, setFocusKey] = useState<keyof PortfolioSocials | null>(null);
  const hidden = socialFields.filter((field) => !shown.includes(field.key));

  return (
    <div className="portfolio-editor__stack">
      <label className="industry-field portfolio-field">
        <span className="industry-field__label">Display name</span>
        <input value={draft.displayName} onChange={(event) => onDisplayName(event.target.value)} />
      </label>
      <div className="portfolio-group">
        <h3>Socials</h3>
        {shown.length ? (
          <div className="portfolio-field-grid">
            {socialFields
              .filter((field) => shown.includes(field.key))
              .map((field) => (
                <div key={field.key} className="industry-field portfolio-field">
                  <label className="industry-field__label" htmlFor={`social-${field.key}`}>
                    {field.label}
                  </label>
                  <div className="portfolio-field__row">
                    <input
                      id={`social-${field.key}`}
                      value={draft.socials[field.key]}
                      placeholder={field.placeholder}
                      inputMode="url"
                      autoFocus={focusKey === field.key}
                      onChange={(event) => onSocial(field.key, event.target.value)}
                    />
                    <button
                      type="button"
                      className="portfolio-icon-button"
                      aria-label={`Remove ${field.label}`}
                      onClick={() => {
                        onSocial(field.key, "");
                        setShown((current) => current.filter((key) => key !== field.key));
                      }}
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="portfolio-editor__hint">Link the accounts you want casting teams to see.</p>
        )}
        {hidden.length ? (
          <div className="portfolio-options">
            {hidden.map((field) => (
              <button
                key={field.key}
                type="button"
                className="portfolio-option portfolio-option--add"
                onClick={() => {
                  setFocusKey(field.key);
                  setShown((current) => [...current, field.key]);
                }}
              >
                <Plus size={14} aria-hidden />
                {field.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WorkFields({
  draft,
  agencies,
  onChange,
}: {
  draft: PortfolioEditorDraft;
  agencies: TalentAgency[];
  onChange: (patch: Partial<PortfolioEditorDraft>) => void;
}) {
  const [showRepresentation, setShowRepresentation] = useState(
    Boolean(draft.representation.trim() || draft.agent.trim() || draft.additionalRepresentations.length),
  );

  return (
    <div className="portfolio-editor__stack">
      <div className="portfolio-group">
        <h3>Working location</h3>
        <WorkingLocationsEditor
          locations={draft.workingLocations}
          onChange={(workingLocations) => onChange({ workingLocations })}
        />
      </div>
      <OptionPicker
        label="Styles"
        options={styleOptions}
        values={draft.styles}
        onChange={(styles) => onChange({ styles })}
      />
      <OptionPicker
        label="Skills"
        options={skillOptions}
        values={draft.skills}
        onChange={(skills) => onChange({ skills })}
      />
      <TrainingFields training={draft.training} onChange={(training) => onChange({ training })} />
      <div className="portfolio-group">
        <h3>Representation</h3>
        {showRepresentation ? (
          <RepresentationEditor
            agencies={agencies}
            representation={draft.representation}
            agent={draft.agent}
            additionalRepresentations={draft.additionalRepresentations}
            onChange={(patch) => onChange(patch)}
          />
        ) : (
          <div className="portfolio-options">
            <button
              type="button"
              className="portfolio-option portfolio-option--add"
              onClick={() => setShowRepresentation(true)}
            >
              <Plus size={14} aria-hidden />
              Add agency
            </button>
          </div>
        )}
      </div>
      <div className="portfolio-group">
        <SingleChoice
          label="Union status"
          options={withCurrent(unionOptions, draft.unionStatus)}
          value={draft.unionStatus}
          onChange={(unionStatus) =>
            onChange({
              unionStatus,
              unionMemberId: unionStatus === "SAG-AFTRA" ? draft.unionMemberId : "",
            })
          }
        />
        {draft.unionStatus === "SAG-AFTRA" ? (
          <label className="industry-field portfolio-field portfolio-editor__member">
            <span className="industry-field__label">Member ID (optional)</span>
            <input
              value={draft.unionMemberId}
              onChange={(event) => onChange({ unionMemberId: event.target.value })}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}

function AttributeFields({
  draft,
  onChange,
}: {
  draft: PortfolioEditorDraft;
  onChange: (patch: Partial<PortfolioEditorDraft>) => void;
}) {
  const ethnicity = parseEthnicityList(draft.ethnicity);
  return (
    <div className="portfolio-editor__stack">
      <SingleChoice
        label="Gender"
        options={withCurrent(genderOptions, draft.gender)}
        value={draft.gender}
        onChange={(gender) => onChange({ gender })}
      />
      <div className="portfolio-group">
        <h3>Height</h3>
        <HeightPicker value={draft.height} onChange={(height) => onChange({ height })} />
      </div>
      <div className="portfolio-group">
        <h3>Ethnicity</h3>
        <p className="portfolio-editor__hint">Select all that apply.</p>
        <div className="portfolio-options">
          {Array.from(new Set([...ethnicityOptions, ...ethnicity])).map((option) => {
            const selected = ethnicity.includes(option);
            return (
              <button
                key={option}
                type="button"
                className="portfolio-option"
                aria-pressed={selected}
                onClick={() =>
                  onChange({
                    ethnicity: serializeEthnicityList(
                      selected ? ethnicity.filter((item) => item !== option) : [...ethnicity, option],
                    ),
                  })
                }
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
      <SingleChoice
        label="Eye color"
        options={withCurrent(eyeColorOptions, draft.eyeColor)}
        value={draft.eyeColor}
        onChange={(eyeColor) => onChange({ eyeColor })}
      />
      <SingleChoice
        label="Hair color"
        options={withCurrent(hairColorOptions, draft.hairColor)}
        value={draft.hairColor}
        onChange={(hairColor) => onChange({ hairColor })}
      />
    </div>
  );
}

function TrainingFields({
  training,
  onChange,
}: {
  training: PortfolioTrainingEntry[];
  onChange: (training: PortfolioTrainingEntry[]) => void;
}) {
  function update(id: string, patch: Partial<PortfolioTrainingEntry>) {
    onChange(training.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  return (
    <div className="portfolio-group">
      <h3>Training</h3>
      {training.length ? (
        <div className="portfolio-training-list">
          {training.map((entry) => (
            <div key={entry.id} className="portfolio-training">
              <div className="portfolio-training__head">
                <label className="industry-field portfolio-field">
                  <span className="industry-field__label">Name</span>
                  <input
                    value={entry.name}
                    placeholder="School, program, or instructor"
                    onChange={(event) => update(entry.id, { name: event.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className="portfolio-icon-button"
                  aria-label={`Remove ${entry.name || "training"}`}
                  onClick={() => onChange(training.filter((item) => item.id !== entry.id))}
                >
                  <X size={16} aria-hidden />
                </button>
              </div>
              <div className="portfolio-training__grid">
                <label className="industry-field portfolio-field">
                  <span className="industry-field__label">Type</span>
                  <select
                    value={entry.trainingType}
                    onChange={(event) => update(entry.id, { trainingType: event.target.value })}
                  >
                    <option value="">Select</option>
                    {withCurrent(trainingTypeOptions, entry.trainingType).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="industry-field portfolio-field">
                  <span className="industry-field__label">Program</span>
                  <input
                    value={entry.program}
                    placeholder="Optional"
                    onChange={(event) => update(entry.id, { program: event.target.value })}
                  />
                </label>
                <label className="industry-field portfolio-field">
                  <span className="industry-field__label">Start</span>
                  <input
                    value={entry.startDate}
                    placeholder="2022"
                    inputMode="numeric"
                    onChange={(event) => update(entry.id, { startDate: event.target.value })}
                  />
                </label>
                <label className="industry-field portfolio-field">
                  <span className="industry-field__label">End</span>
                  <input
                    value={entry.endDate}
                    placeholder="2024"
                    inputMode="numeric"
                    onChange={(event) => update(entry.id, { endDate: event.target.value })}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="portfolio-options">
        <button
          type="button"
          className="portfolio-option portfolio-option--add"
          onClick={() => onChange([...training, blankTrainingEntry()])}
        >
          <Plus size={14} aria-hidden />
          Add training
        </button>
      </div>
    </div>
  );
}

function SingleChoice({
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
    <div className="portfolio-group">
      <h3>{label}</h3>
      <div className="portfolio-options">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="portfolio-option"
            aria-pressed={value === option}
            onClick={() => onChange(value === option ? "" : option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function OptionPicker({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const remaining = Array.from(new Set(options)).filter(
    (option) => !values.includes(option) && (!needle || option.toLowerCase().includes(needle)),
  );

  return (
    <div className="portfolio-group">
      <h3>{label}</h3>
      <div className="portfolio-options">
        {values.map((option) => (
          <button
            key={option}
            type="button"
            className="portfolio-option"
            aria-pressed
            aria-label={`Remove ${option}`}
            onClick={() => onChange(values.filter((item) => item !== option))}
          >
            {option}
            <X size={14} aria-hidden />
          </button>
        ))}
        <button
          type="button"
          className="portfolio-option portfolio-option--add"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
            setQuery("");
          }}
        >
          {open ? (
            "Done"
          ) : (
            <>
              <Plus size={14} aria-hidden />
              {values.length ? "Add more" : `Add ${label.toLowerCase()}`}
            </>
          )}
        </button>
      </div>
      {open ? (
        <div className="portfolio-picker">
          {options.length > SEARCHABLE_OPTION_COUNT ? (
            <label className="portfolio-picker__search">
              <Search size={16} aria-hidden />
              <input
                className="workspace-bare-input"
                value={query}
                placeholder={`Search ${label.toLowerCase()}`}
                aria-label={`Search ${label.toLowerCase()}`}
                autoFocus
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          ) : null}
          <div className="portfolio-options">
            {remaining.map((option) => (
              <button
                key={option}
                type="button"
                className="portfolio-option"
                aria-pressed={false}
                onClick={() => onChange([...values, option])}
              >
                {option}
              </button>
            ))}
            {!remaining.length ? <p className="portfolio-editor__hint">No matches.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function withCurrent(options: string[], current: string) {
  const value = current.trim();
  if (!value || options.includes(value)) return options;
  return [value, ...options];
}
