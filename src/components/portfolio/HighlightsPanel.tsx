"use client";

import { ArrowLeft, ChevronsUpDown, Crop, ImagePlus, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { savePortfolioHighlights } from "@/app/portfolio/material-actions";
import { PORTFOLIO_LIMITS, unlockedCount } from "@/lib/app/portfolio-limits";
import type { OwnerHighlight } from "@/lib/app/portfolio-owner";
import {
  buildResumeExperienceItems,
  RESUME_EXPERIENCE_CATEGORIES,
  type ResumeExperienceCategory,
} from "@/lib/profile/resume-experience";
import type { ProfileExperience } from "@/types/public";

import { prepareCardImage, uploadPublicObject } from "./media";
import {
  ActionBar,
  ActionButton,
  AddTile,
  ConfirmBar,
  CropDialog,
  EmptyHero,
  HeroCard,
  LockBadge,
  moveItem,
  Notice,
  SaveButton,
  StripHeading,
  useObjectUrls,
  usePointerReorder,
} from "./PanelKit";
import { PanelActions, useReportDirty, type PortfolioPanelProps } from "./panel-shared";

type Item = OwnerHighlight & { preview?: string; pending?: Blob; source?: string };
type Project = { id: string; title: string; subtitle: string; category: ResumeExperienceCategory };
type Mode = { kind: "edit" } | { kind: "pick"; purpose: "add" | "change" } | { kind: "cover"; project: Project };

export function HighlightsPanel({ owner, actionsHost, onDirtyChange, onSaved }: PortfolioPanelProps) {
  const [baseline, setBaseline] = useState<Item[]>(owner.highlights);
  const [items, setItems] = useState<Item[]>(owner.highlights);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<Mode>({ kind: "edit" });
  const [crop, setCrop] = useState<{ src: string; target: "selected" | "new" } | null>(null);
  const [newCover, setNewCover] = useState<{ blob: Blob; preview: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const coverTarget = useRef<"selected" | "new">("selected");
  const objectUrl = useObjectUrls();

  const unlocked = unlockedCount(owner.plan, "highlights");
  const cap = owner.plan === "pro" ? PORTFOLIO_LIMITS.highlights.pro : unlocked;
  const current = items[selected];
  const dirty =
    items.some((item) => item.pending) ||
    JSON.stringify(items.map(({ id, experience_id, image_url }) => [id, experience_id, image_url])) !==
      JSON.stringify(baseline.map(({ id, experience_id, image_url }) => [id, experience_id, image_url]));
  useReportDirty(dirty, onDirtyChange);

  const projects = useMemo(() => {
    const experiences = owner.experiences as unknown as ProfileExperience[];
    return RESUME_EXPERIENCE_CATEGORIES.map(({ key, label }) => ({
      key,
      label,
      items: buildResumeExperienceItems(experiences, key).map<Project>((item) => ({
        id: String(item.entry.id ?? item.id),
        title: item.title,
        subtitle: item.companyLabel,
        category: key,
      })),
    }));
  }, [owner.experiences]);

  const reorder = usePointerReorder({
    axis: "x",
    onTap: (index) => setSelected(index),
    onReorder: (from, to) => {
      setItems((list) => moveItem(list, from, to));
      setSelected(to);
    },
  });

  function isTaken(project: Project, ignoreIndex?: number) {
    return items.some(
      (item, index) =>
        index !== ignoreIndex &&
        (item.experience_id === project.id || item.title.trim().toLowerCase() === project.title.trim().toLowerCase()),
    );
  }

  async function pickCover(file: File) {
    setError(null);
    try {
      const { display, source } = await prepareCardImage(file);
      const preview = objectUrl(display);
      const sourceUrl = objectUrl(source);
      if (coverTarget.current === "new") {
        setNewCover({ blob: display, preview });
      } else {
        setItems((list) => list.map((item, index) => (index === selected ? { ...item, preview, pending: display, source: sourceUrl } : item)));
      }
      setCrop({ src: sourceUrl, target: coverTarget.current });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not use that image.");
    }
  }

  function chooseCover(target: "selected" | "new") {
    coverTarget.current = target;
    coverInput.current?.click();
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const folder = owner.userId.toLowerCase();
      const uploaded = await Promise.all(
        items.map(async (item, index) => {
          if (!item.pending) return item;
          const url = await uploadPublicObject("headshots", `${folder}/highlight_${Date.now()}_${index}.jpg`, item.pending, "image/jpeg");
          return { ...item, image_url: url, pending: undefined, preview: undefined, source: undefined };
        }),
      );
      const result = await savePortfolioHighlights(
        uploaded.map((item) => ({
          id: item.id,
          experience_id: item.experience_id ?? null,
          title: item.title,
          subtitle: item.subtitle ?? null,
          image_url: item.image_url ?? null,
        })),
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems(uploaded);
      setBaseline(uploaded);
      onSaved("Highlights saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your highlights.");
    } finally {
      setPending(false);
    }
  }

  const input = (
    <input
      ref={coverInput}
      type="file"
      accept="image/jpeg,image/png,image/heic,image/webp"
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void pickCover(file);
        event.target.value = "";
      }}
    />
  );

  const cropDialog = crop ? (
    <CropDialog
      src={crop.src}
      title="Crop highlight"
      onCancel={() => setCrop(null)}
      onApply={(blob) => {
        const preview = objectUrl(blob);
        if (crop.target === "new") setNewCover({ blob, preview });
        else setItems((list) => list.map((item, index) => (index === selected ? { ...item, preview, pending: blob } : item)));
        setCrop(null);
      }}
    />
  ) : null;

  if (mode.kind === "pick") {
    const changing = mode.purpose === "change";
    return (
      <div className="portfolio-panel-stack">
        <button type="button" className="portfolio-back" onClick={() => setMode({ kind: "edit" })}>
          <ArrowLeft size={16} aria-hidden /> Highlights
        </button>
        <div>
          <h3 className="portfolio-subview-title">{changing ? "Change project" : "Add highlight"}</h3>
          <p className="portfolio-subview-hint">Choose a credit from your resume to feature.</p>
        </div>
        {projects.every((group) => group.items.length === 0) ? (
          <Notice>Add credits to your resume first, then feature them here.</Notice>
        ) : (
          projects
            .filter((group) => group.items.length)
            .map((group) => (
              <section key={group.key} className="portfolio-pick-group">
                <h4>{group.label}</h4>
                <ul>
                  {group.items.map((project) => {
                    const taken = isTaken(project, changing ? selected : undefined);
                    return (
                      <li key={project.id}>
                        <button
                          type="button"
                          className="portfolio-pick-row"
                          disabled={taken}
                          onClick={() => {
                            if (changing) {
                              setItems((list) => list.map((item, index) => (index === selected ? { ...item, experience_id: project.id, title: project.title, subtitle: project.subtitle } : item)));
                              setMode({ kind: "edit" });
                            } else {
                              setNewCover(null);
                              setMode({ kind: "cover", project });
                            }
                          }}
                        >
                          <span>{project.title}</span>
                          <small>{taken ? "Already featured" : project.subtitle}</small>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
        )}
      </div>
    );
  }

  if (mode.kind === "cover") {
    return (
      <div className="portfolio-panel-stack">
        {input}
        <button type="button" className="portfolio-back" onClick={() => setMode({ kind: "pick", purpose: "add" })}>
          <ArrowLeft size={16} aria-hidden /> Choose project
        </button>
        <HeroCard>
          {newCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={newCover.preview} alt="" draggable={false} />
          ) : (
            <EmptyHero icon={<ImagePlus size={28} strokeWidth={1.5} />} title="Add a cover image" detail="A cover image is required to add this highlight." />
          )}
          <div className="portfolio-hero__caption">
            <p>{mode.project.title}</p>
            <span>{mode.project.subtitle}</span>
          </div>
        </HeroCard>
        <ActionBar>
          <button type="button" className="portfolio-button-secondary" onClick={() => chooseCover("new")}>
            {newCover ? "Choose another image" : "Add cover image"}
          </button>
          <button
            type="button"
            className="portfolio-panel-save"
            disabled={!newCover}
            onClick={() => {
              if (!newCover) return;
              const item: Item = {
                id: crypto.randomUUID(),
                experience_id: mode.project.id,
                title: mode.project.title,
                subtitle: mode.project.subtitle,
                image_url: null,
                preview: newCover.preview,
                pending: newCover.blob,
              };
              setItems((list) => [...list, item]);
              setSelected(items.length);
              setNewCover(null);
              setMode({ kind: "edit" });
            }}
          >
            Add
          </button>
        </ActionBar>
        {error ? <Notice tone="error" onDismiss={() => setError(null)}>{error}</Notice> : null}
        {cropDialog}
      </div>
    );
  }

  const image = current?.preview || current?.image_url || null;
  const locked = selected >= unlocked;

  return (
    <div className="portfolio-panel-stack">
      <PanelActions host={actionsHost}>
        <SaveButton dirty={dirty} pending={pending} onClick={() => void save()} />
      </PanelActions>
      {input}

      <HeroCard>
        {current ? (
          <>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" draggable={false} className={locked ? "is-locked" : undefined} />
            ) : (
              <EmptyHero icon={<ImagePlus size={28} strokeWidth={1.5} />} title="No cover image" detail="Add a cover so this highlight stands out." />
            )}
            {locked ? (
              <div className="portfolio-hero__locked">
                <LockBadge />
                <p>Your first {unlocked} highlights stay active. Upgrade to Pro in the Motiion app to show this one.</p>
              </div>
            ) : null}
            <div className="portfolio-hero__caption">
              <p>{current.title}</p>
            </div>
            <div className="portfolio-hero__footer">
              <button type="button" className="portfolio-pill" onClick={() => setMode({ kind: "pick", purpose: "change" })} aria-label="Change project">
                {current.subtitle || current.title}
                <ChevronsUpDown size={14} aria-hidden />
              </button>
            </div>
          </>
        ) : (
          <EmptyHero icon={<Sparkles size={28} strokeWidth={1.5} />} title="Feature your standout credits" detail="Pick a credit from your resume and give it a cover image." />
        )}
      </HeroCard>

      <ActionBar>
        {current ? (
          <>
            <ActionButton label={image ? "Replace cover image" : "Add cover image"} onClick={() => chooseCover("selected")} disabled={pending}>
              {image ? <ImagePlus size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
            </ActionButton>
            <ActionButton
              label="Crop highlight"
              disabled={!image || pending}
              onClick={() => current && setCrop({ src: current.source || current.image_url || current.preview || "", target: "selected" })}
            >
              <Crop size={18} aria-hidden />
            </ActionButton>
            <ActionButton label="Delete highlight" tone="danger" onClick={() => setConfirmDelete(true)} disabled={pending}>
              <Trash2 size={18} aria-hidden />
            </ActionButton>
          </>
        ) : (
          <button type="button" className="portfolio-panel-save" onClick={() => setMode({ kind: "pick", purpose: "add" })}>
            Add highlight
          </button>
        )}
      </ActionBar>

      {confirmDelete ? (
        <ConfirmBar
          message="Delete highlight? This removes the featured credit from your highlight reel. Save to keep the change."
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setItems((list) => list.filter((_, index) => index !== selected));
            setSelected((index) => Math.max(0, Math.min(index, items.length - 2)));
            setConfirmDelete(false);
          }}
        />
      ) : null}
      {error ? <Notice tone="error" onDismiss={() => setError(null)}>{error}</Notice> : null}

      <section className="portfolio-strip-section">
        <StripHeading title="Uploads" count={`${items.length}/${cap}`} hint="Drag to reorder how highlights appear on your profile." />
        <div className="portfolio-strip" ref={reorder.containerRef}>
          <AddTile
            label="Add highlight"
            locked={items.length >= unlocked}
            onClick={() => {
              if (items.length >= unlocked) {
                setError(owner.plan === "pro" ? `You can feature up to ${cap} highlights.` : `Free portfolios include ${unlocked} highlights. Upgrade to Pro in the Motiion app for up to ${PORTFOLIO_LIMITS.highlights.pro}.`);
                return;
              }
              setMode({ kind: "pick", purpose: "add" });
            }}
          />
          {items.map((item, index) => {
            const thumb = item.preview || item.image_url;
            return (
              <button
                key={item.id}
                type="button"
                className="portfolio-thumb portfolio-media-card"
                aria-label={`Highlight ${index + 1}, ${item.title}`}
                aria-pressed={index === selected}
                {...reorder.bind(index)}
                onClick={(event) => event.detail === 0 && setSelected(index)}
                onKeyDown={(event) => {
                  if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
                  event.preventDefault();
                  const to = index + (event.key === "ArrowLeft" ? -1 : 1);
                  if (to < 0 || to >= items.length) return;
                  setItems((list) => moveItem(list, index, to));
                  setSelected(to);
                }}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" draggable={false} />
                ) : (
                  <span className="portfolio-thumb__text">{item.title}</span>
                )}
                <span className="portfolio-thumb__index">{index + 1}</span>
                {index >= unlocked ? <LockBadge /> : null}
              </button>
            );
          })}
        </div>
      </section>
      {cropDialog}
    </div>
  );
}
