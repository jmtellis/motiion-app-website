"use client";

import { ArrowLeft, BadgeCheck, ExternalLink, FileText, GripVertical, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { processOnboardingResume } from "@/app/onboarding/media-actions";
import { importPortfolioResume, savePortfolioExperiences } from "@/app/portfolio/material-actions";
import type { OwnerExperience } from "@/lib/app/portfolio-owner";
import { renderPdfPagesToJpegBlobs } from "@/lib/onboarding/client-media";
import type { ResumeExperienceCategory } from "@/lib/profile/resume-experience";

import { ConfirmBar, moveItem, Notice, SaveButton, usePointerReorder } from "./PanelKit";
import { PanelActions, useReportDirty, type PortfolioPanelProps } from "./panel-shared";
import { creditColumn, list, projectColumn, RESUME_SECTIONS as SECTIONS, resumeSections, rolesOf, text } from "./resume-rows";

const ROLES = ["Dancer", "Assistant", "Choreographer", "Associate Choreographer", "Show Director", "Creative Director", "Other"];
const DURATIONS = ["1 day", "1 week", "1 month", "1 year"];
const LIVE_SUBTYPES = [
  { key: "festivals", label: "Festivals" },
  { key: "tours", label: "Tours" },
  { key: "concerts", label: "Concerts" },
  { key: "corporate", label: "Corporate" },
  { key: "awardShows", label: "Award Shows" },
  { key: "theaterProduction", label: "Theater Shows" },
  { key: "other", label: "Other" },
];

export function ResumePanel({ owner, actionsHost, onDirtyChange, onSaved }: PortfolioPanelProps) {
  const [experiences, setExperiences] = useState<OwnerExperience[]>(owner.experiences);
  const [resumeUrl, setResumeUrl] = useState(owner.resumeUrl);
  const [editing, setEditing] = useState<{ draft: OwnerExperience; isNew: boolean } | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const sections = useMemo(() => resumeSections(experiences), [experiences]);
  const total = sections.reduce((sum, section) => sum + section.items.length, 0);

  async function persist(next: OwnerExperience[], message: string) {
    const previous = experiences;
    setExperiences(next);
    setSaving(true);
    setError(null);
    const result = await savePortfolioExperiences(next);
    setSaving(false);
    if (!result.ok) {
      setExperiences(previous);
      setError(result.error);
      return false;
    }
    onSaved(message);
    return true;
  }

  function reorderWithin(category: ResumeExperienceCategory, from: number, to: number) {
    const slots = sections.find((section) => section.key === category)?.items.map((item) => item.index) ?? [];
    const reordered = moveItem(slots.map((slot) => experiences[slot]!), from, to);
    const next = [...experiences];
    slots.forEach((slot, position) => {
      next[slot] = reordered[position]!;
    });
    void persist(next, "Resume order saved");
  }

  async function importResume(file: File) {
    setError(null);
    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) return setError("Choose a PDF or image of your resume.");
    if (file.size > 20 * 1024 * 1024) return setError("Choose a resume under 20 MB.");
    try {
      const formData = new FormData();
      formData.append("source", file);
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setImporting("Reading document…");
        const pages = await renderPdfPagesToJpegBlobs(file);
        pages.forEach((page, index) => formData.append("pages", page, `resume_page_${index + 1}.jpg`));
      }
      setImporting("Extracting credits…");
      const processed = await processOnboardingResume(formData);
      if (!processed.ok) return setError(processed.error);
      setImporting("Adding credits…");
      const result = await importPortfolioResume({ resumeUrl: processed.resumeUrl, experiences: processed.draftPatch.experiences ?? [] });
      if (!result.ok) return setError(result.error);
      setResumeUrl(processed.resumeUrl);
      if (result.experiences) setExperiences(result.experiences);
      onSaved(result.added ? `Added ${result.added} credit${result.added === 1 ? "" : "s"} from your resume` : "Resume uploaded — no new credits found");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Resume import failed.");
    } finally {
      setImporting(null);
    }
  }

  if (editing) {
    return (
      <ExperienceEditor
        key={editing.draft.id}
        initial={editing.draft}
        isNew={editing.isNew}
        actionsHost={actionsHost}
        onDirtyChange={onDirtyChange}
        onBack={() => setEditing(null)}
        onSave={async (draft) => {
          const exists = experiences.some((item) => item.id === draft.id);
          const next = exists ? experiences.map((item) => (item.id === draft.id ? draft : item)) : [...experiences, draft];
          if (await persist(next, exists ? "Credit saved" : "Credit added")) setEditing(null);
        }}
        onDelete={async () => {
          if (await persist(experiences.filter((item) => item.id !== editing.draft.id), "Credit deleted")) setEditing(null);
        }}
        error={error}
        saving={saving}
      />
    );
  }

  return (
    <div className="portfolio-panel-stack">
      <input
        ref={importInput}
        type="file"
        accept="application/pdf,image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importResume(file);
          event.target.value = "";
        }}
      />
      <div className="portfolio-resume-toolbar">
        <p>{total} credit{total === 1 ? "" : "s"}{saving ? " · Saving…" : ""}</p>
        <div>
          {resumeUrl ? (
            <a className="portfolio-button-secondary" href={resumeUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} aria-hidden /> Original
            </a>
          ) : null}
          <button type="button" className="portfolio-button-secondary" disabled={Boolean(importing)} onClick={() => importInput.current?.click()}>
            {importing ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Upload size={14} aria-hidden />}
            {importing ?? (resumeUrl ? "Upload new" : "Import resume")}
          </button>
          <button type="button" className="portfolio-panel-save" aria-expanded={adding} onClick={() => setAdding((open) => !open)}>
            <Plus size={14} aria-hidden /> Add experience
          </button>
        </div>
      </div>

      {adding ? (
        <div className="portfolio-add-menu" role="menu" aria-label="Experience type">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              role="menuitem"
              className="portfolio-menu-row"
              onClick={() => {
                setAdding(false);
                setEditing({ isNew: true, draft: { id: crypto.randomUUID(), title: "", category: section.key, source: "manual", roles: [] } });
              }}
            >
              {section.heading}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <Notice tone="error" onDismiss={() => setError(null)}>{error}</Notice> : null}

      {total === 0 ? (
        <div className="portfolio-empty-card">
          <FileText size={26} strokeWidth={1.5} aria-hidden />
          <p>Add experience to build your resume.</p>
          <span>Import a PDF or photo of your resume, or add credits one at a time.</span>
        </div>
      ) : (
        <div className="portfolio-resume">
          <div className="portfolio-resume__head" aria-hidden>
            <span />
            <span>Project</span>
            <span>Role</span>
            <span>Credit</span>
          </div>
          {sections
            .filter((section) => section.items.length)
            .map((section) => (
              <ResumeSection
                key={section.key}
                heading={section.heading}
                category={section.key}
                items={section.items}
                disabled={saving}
                onOpen={(entry) => setEditing({ draft: entry, isNew: false })}
                onReorder={(from, to) => reorderWithin(section.key, from, to)}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function ResumeSection({
  heading,
  category,
  items,
  disabled,
  onOpen,
  onReorder,
}: {
  heading: string;
  category: ResumeExperienceCategory;
  items: { index: number; entry: OwnerExperience }[];
  disabled: boolean;
  onOpen: (entry: OwnerExperience) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const { containerRef, bind } = usePointerReorder({ axis: "y", onReorder });
  return (
    <section className="portfolio-resume__section" aria-label={heading}>
      <h3>{heading}</h3>
      <div ref={containerRef}>
        {items.map(({ entry }, position) => {
          const verified = Boolean(text(entry.verification_status));
          const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, ...row } = bind(position, { disabled });
          return (
            <div key={entry.id} className="portfolio-resume__row" {...row}>
              {items.length > 1 ? (
                <button
                  type="button"
                  className="portfolio-resume__grip"
                  aria-label={`Reorder ${entry.title}. Use Alt and arrow keys to move.`}
                  disabled={disabled}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                  onKeyDown={(event) => {
                    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
                    event.preventDefault();
                    const to = position + (event.key === "ArrowUp" ? -1 : 1);
                    if (to >= 0 && to < items.length) onReorder(position, to);
                  }}
                >
                  <GripVertical size={16} aria-hidden />
                </button>
              ) : (
                <span />
              )}
              <button type="button" className="portfolio-resume__open portfolio-row-button" onClick={() => onOpen(entry)}>
                <span>
                  {projectColumn(entry, category)}
                  {verified ? <BadgeCheck size={14} aria-label="Motiion verified" /> : null}
                </span>
                <span>{rolesOf(entry).join(", ") || "—"}</span>
                <span>{creditColumn(entry)}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ExperienceEditor({
  initial,
  isNew,
  actionsHost,
  onDirtyChange,
  onBack,
  onSave,
  onDelete,
  error,
  saving,
}: {
  initial: OwnerExperience;
  isNew: boolean;
  actionsHost: HTMLElement | null;
  onDirtyChange: (dirty: boolean) => void;
  onBack: () => void;
  onSave: (draft: OwnerExperience) => Promise<void>;
  onDelete: () => Promise<void>;
  error: string | null;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(initial);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const dirty = isNew || JSON.stringify(draft) !== JSON.stringify(initial);
  useReportDirty(dirty, onDirtyChange);

  const category = (draft.category as ResumeExperienceCategory) ?? "televisionFilm";
  const subtype = text(draft.live_stage_subtype) || "festivals";
  const roles = rolesOf(draft);
  const isTv = text(draft.tv_film_tmdb_project_media_kind) === "tv";

  function set(key: string, value: unknown) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function field(key: string, label: string, placeholder = "") {
    return (
      <label className="portfolio-field-row">
        <span>{label}</span>
        <input value={typeof draft[key] === "string" ? (draft[key] as string) : ""} placeholder={placeholder} onChange={(event) => set(key, event.target.value)} />
      </label>
    );
  }

  function listField(key: string, label: string, placeholder = "Separate names with commas") {
    return (
      <label className="portfolio-field-row">
        <span>{label}</span>
        <input
          defaultValue={list(draft[key]).join(", ")}
          placeholder={placeholder}
          onChange={(event) => set(key, event.target.value.split(",").map((item) => item.trim()).filter(Boolean))}
        />
      </label>
    );
  }

  const titleLabel =
    category === "musicVideos"
      ? "Song title"
      : category === "printCommercial"
        ? "Company"
        : category === "liveStage"
          ? subtype === "tours" ? "Tour name" : subtype === "theaterProduction" ? "Show title" : "Event name"
          : "Title";

  async function submit() {
    if (!text(draft.title)) {
      setLocalError(`Add a ${titleLabel.toLowerCase()} for this credit.`);
      return;
    }
    setLocalError(null);
    const cleaned: OwnerExperience = { ...draft, title: text(draft.title), role: roles[0] ?? null, roles };
    await onSave(cleaned);
  }

  return (
    <div className="portfolio-panel-stack">
      <PanelActions host={actionsHost}>
        <SaveButton dirty={dirty} pending={saving} onClick={() => void submit()} label={isNew ? "Add" : "Save"} />
      </PanelActions>
      <button type="button" className="portfolio-back" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden /> Resume
      </button>
      <div>
        <p className="portfolio-subview-eyebrow">{SECTIONS.find((section) => section.key === category)?.heading}</p>
        <h3 className="portfolio-subview-title">{text(draft.title) || (isNew ? "New experience" : "Untitled credit")}</h3>
        {text(draft.verification_status) ? (
          <p className="portfolio-verified"><BadgeCheck size={14} aria-hidden /> Motiion verified</p>
        ) : null}
      </div>

      <div className="portfolio-form">
        {category === "liveStage" ? (
          <label className="portfolio-field-row">
            <span>Type</span>
            <select value={subtype} onChange={(event) => set("live_stage_subtype", event.target.value)}>
              {LIVE_SUBTYPES.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
        ) : null}

        {field("title", titleLabel)}
        {category === "televisionFilm" ? field("credits", "Studio") : null}
        {category === "musicVideos" ? listField("song_artists", "Song artist(s)") : null}
        {category === "printCommercial" ? (
          <>
            {field("alternate_title", "Campaign title")}
            {field("production_company", "Production company")}
          </>
        ) : null}
        {category === "liveStage" && (subtype === "tours" || subtype === "corporate") ? field("credits", subtype === "tours" ? "Artist" : "Company") : null}
        {category === "liveStage" && subtype === "theaterProduction" ? field("theater_name", "Theater") : null}

        <fieldset className="portfolio-field-row">
          <legend>Role</legend>
          <div className="portfolio-option-row">
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                aria-pressed={roles.includes(role)}
                onClick={() => set("roles", roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role])}
              >
                {role}
              </button>
            ))}
          </div>
        </fieldset>

        {category !== "musicVideos" ? field("main_talent", "Main talent") : null}
        {(category === "televisionFilm" && !isTv) || category === "musicVideos" || category === "printCommercial" || (category === "liveStage" && subtype === "theaterProduction")
          ? field("director", "Director")
          : null}
        {listField("choreographers", "Choreographer(s)")}
        {listField("associate_choreographers", "Associate choreographer(s)")}
        {listField("assistants", "Assistants")}

        <div className="portfolio-field-pair">
          {field("start_date", "Start date", "e.g. 2024 or Mar 2024")}
          <label className="portfolio-field-row">
            <span>Duration</span>
            <select value={text(draft.duration)} onChange={(event) => set("duration", event.target.value || null)}>
              <option value="">Not set</option>
              {DURATIONS.map((duration) => (
                <option key={duration} value={duration}>{duration}</option>
              ))}
            </select>
          </label>
        </div>
        {field("link_url", "Video link", "https://")}
      </div>

      {localError || error ? <Notice tone="error">{localError || error}</Notice> : null}

      {!isNew ? (
        confirmDelete ? (
          <ConfirmBar message="Delete this credit? It will be removed from your resume and profile." confirmLabel="Delete" onCancel={() => setConfirmDelete(false)} onConfirm={() => void onDelete()} />
        ) : (
          <button type="button" className="portfolio-delete-link" onClick={() => setConfirmDelete(true)} disabled={saving}>
            <Trash2 size={14} aria-hidden /> Delete credit
          </button>
        )
      ) : null}
    </div>
  );
}
