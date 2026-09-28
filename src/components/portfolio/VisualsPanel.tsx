"use client";

import { Film, Lock, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { savePortfolioVisuals } from "@/app/portfolio/material-actions";
import { hasProVisuals, PORTFOLIO_LIMITS } from "@/lib/app/portfolio-limits";
import type { OwnerVisual } from "@/lib/app/portfolio-owner";

import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, readVideoMetadata, uploadPublicObject, videoExtension } from "./media";
import { ActionBar, ActionButton, AddTile, ConfirmBar, EmptyHero, HeroCard, LockBadge, Notice, SaveButton, StripHeading, useObjectUrls } from "./PanelKit";
import { PanelActions, useReportDirty, type PortfolioPanelProps } from "./panel-shared";

type Chip = "reel" | "slate" | "style" | "skill" | "other";
type Clip = {
  id: string;
  kind: Chip;
  ref?: string | null;
  url: string;
  sort?: number;
  duration_seconds?: number | null;
  preview?: string;
  file?: File;
};

const CHIPS: { key: Chip; label: string; pro: boolean }[] = [
  { key: "reel", label: "Reel", pro: false },
  { key: "slate", label: "Slate", pro: false },
  { key: "style", label: "Styles", pro: true },
  { key: "skill", label: "Skills", pro: true },
  { key: "other", label: "More", pro: true },
];

const REMOVE_COPY: Record<Chip, string> = {
  reel: "This removes your reel from your profile.",
  slate: "This removes your slate from your profile.",
  style: "This removes the clip for this style.",
  skill: "This removes the clip for this skill.",
  other: "This removes this clip from your profile.",
};

export function VisualsPanel({ owner, actionsHost, onDirtyChange, onSaved }: PortfolioPanelProps) {
  const initial = useMemo(
    () =>
      owner.visuals.flatMap((visual: OwnerVisual): Clip[] =>
        visual.kind === "experience"
          ? []
          : [{ id: visual.id, kind: visual.kind, ref: visual.ref ?? null, url: visual.url, sort: visual.sort ?? 0, duration_seconds: visual.duration_seconds ?? null }],
      ),
    [owner.visuals],
  );
  const [baseline, setBaseline] = useState<Clip[]>(initial);
  const [clips, setClips] = useState<Clip[]>(initial);
  const [chip, setChip] = useState<Chip>("reel");
  const [tag, setTag] = useState<string | null>(null);
  const [otherIndex, setOtherIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const addingOther = useRef(false);
  const objectUrl = useObjectUrls();

  const pro = hasProVisuals(owner.plan);
  const dirty =
    clips.some((clip) => clip.file) ||
    JSON.stringify(clips.map(({ id, url, ref, kind }) => [id, url, ref, kind])) !==
      JSON.stringify(baseline.map(({ id, url, ref, kind }) => [id, url, ref, kind]));
  useReportDirty(dirty, onDirtyChange);

  const tags = chip === "style" ? owner.styles : chip === "skill" ? owner.skills : [];
  const activeTag = tag && tags.includes(tag) ? tag : tags[0] ?? null;
  const others = clips.filter((clip) => clip.kind === "other").sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const current =
    chip === "reel" || chip === "slate"
      ? clips.find((clip) => clip.kind === chip)
      : chip === "other"
        ? others[otherIndex]
        : clips.find((clip) => clip.kind === chip && clip.ref === activeTag);
  const chipLocked = CHIPS.find((item) => item.key === chip)?.pro && !pro;
  const heroLabel = chip === "reel" ? "Reel" : chip === "slate" ? "Slate" : chip === "other" ? "More" : activeTag ?? "";

  async function applyFile(file: File) {
    setError(null);
    if (!file.type.startsWith("video/")) return setError("Choose a video file.");
    if (file.size > MAX_VIDEO_BYTES) return setError("Choose a video under 80 MB.");
    try {
      const { duration } = await readVideoMetadata(file);
      if (duration > MAX_VIDEO_SECONDS + 0.5) return setError(`Clips can be up to ${MAX_VIDEO_SECONDS} seconds. Trim this video and try again.`);
      const preview = objectUrl(file);
      const replacing = current && !addingOther.current;
      if (replacing) {
        setClips((list) => list.map((clip) => (clip.id === current.id ? { ...clip, url: preview, preview, file, duration_seconds: duration } : clip)));
      } else {
        const clip: Clip = {
          id: crypto.randomUUID(),
          kind: chip,
          ref: chip === "style" || chip === "skill" ? activeTag : null,
          url: preview,
          preview,
          file,
          sort: chip === "other" ? others.length : 0,
          duration_seconds: duration,
        };
        setClips((list) => [...list, clip]);
        if (chip === "other") setOtherIndex(others.length);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not use that video.");
    } finally {
      addingOther.current = false;
    }
  }

  function pick(addOther = false) {
    addingOther.current = addOther;
    fileInput.current?.click();
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const folder = owner.userId.toLowerCase();
      const uploaded = await Promise.all(
        clips.map(async (clip) => {
          if (!clip.file) return clip;
          const { ext, type } = videoExtension(clip.file);
          const url = await uploadPublicObject("profile-videos", `${folder}/${clip.id.toLowerCase()}-${crypto.randomUUID().toLowerCase()}.${ext}`, clip.file, type);
          return { ...clip, url, file: undefined, preview: undefined };
        }),
      );
      let otherSort = 0;
      const payload = uploaded.map((clip) => ({
        id: clip.id,
        kind: clip.kind,
        ref: clip.ref ?? null,
        url: clip.url,
        sort: clip.kind === "other" ? otherSort++ : 0,
        duration_seconds: typeof clip.duration_seconds === "number" ? Math.round(clip.duration_seconds * 10) / 10 : null,
      }));
      const result = await savePortfolioVisuals(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setClips(uploaded);
      setBaseline(uploaded);
      onSaved("Visuals saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your visuals.");
    } finally {
      setPending(false);
    }
  }

  const canAdd = !chipLocked && (chip !== "style" && chip !== "skill" ? true : Boolean(activeTag));

  return (
    <div className="portfolio-panel-stack">
      <PanelActions host={actionsHost}>
        <SaveButton dirty={dirty} pending={pending} onClick={() => void save()} />
      </PanelActions>
      <input
        ref={fileInput}
        type="file"
        accept="video/mp4,video/quicktime,.mp4,.mov"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void applyFile(file);
          event.target.value = "";
        }}
      />

      <div className="portfolio-chips" role="tablist" aria-label="Visual type">
        {CHIPS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={chip === item.key}
            onClick={() => {
              setChip(item.key);
              setTag(null);
              setOtherIndex(0);
              setConfirmDelete(false);
            }}
          >
            {item.label}
            {item.pro && !pro ? <Lock size={12} aria-label="Pro" /> : null}
          </button>
        ))}
      </div>

      <HeroCard className="portfolio-hero--video">
        {current ? (
          <video key={current.url} src={current.url} controls playsInline loop preload="metadata" className={chipLocked ? "is-locked" : undefined} />
        ) : chipLocked ? (
          <EmptyHero icon={<Lock size={26} strokeWidth={1.5} />} title="Pro visuals" detail="Upgrade to Pro in the Motiion app to add style, skill, and extra clips." />
        ) : (chip === "style" || chip === "skill") && !tags.length ? (
          <EmptyHero
            icon={<Film size={28} strokeWidth={1.5} />}
            title={`No ${chip === "style" ? "styles" : "skills"} on your profile`}
            detail={`Add ${chip === "style" ? "styles" : "skills"} in the profile details below, then attach a clip to each one.`}
          />
        ) : (
          <EmptyHero icon={<Film size={28} strokeWidth={1.5} />} title={`Add your ${heroLabel.toLowerCase() || "clip"}`} detail={`MP4 or MOV, up to ${MAX_VIDEO_SECONDS} seconds.`} />
        )}
        {current && chipLocked ? (
          <div className="portfolio-hero__locked">
            <LockBadge />
            <p>This clip is saved but hidden until you upgrade to Pro.</p>
          </div>
        ) : null}
        {heroLabel ? (
          <div className="portfolio-hero__header">
            <span className="portfolio-pill portfolio-pill--static">{heroLabel}</span>
          </div>
        ) : null}
      </HeroCard>

      <ActionBar>
        {current ? (
          <>
            <ActionButton label="Replace video" onClick={() => pick()} disabled={pending}>
              <RefreshCw size={18} aria-hidden />
            </ActionButton>
            <ActionButton label="Delete video" tone="danger" onClick={() => setConfirmDelete(true)} disabled={pending}>
              <Trash2 size={18} aria-hidden />
            </ActionButton>
          </>
        ) : (
          <button type="button" className="portfolio-panel-save" disabled={!canAdd || pending} onClick={() => pick(chip === "other")}>
            {chipLocked ? "Available with Pro" : "Add video"}
          </button>
        )}
      </ActionBar>

      {confirmDelete && current ? (
        <ConfirmBar
          message={`Remove video? ${REMOVE_COPY[current.kind]} Save to keep the change.`}
          confirmLabel="Remove"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setClips((list) => list.filter((clip) => clip.id !== current.id));
            if (chip === "other") setOtherIndex((index) => Math.max(0, index - 1));
            setConfirmDelete(false);
          }}
        />
      ) : null}
      {error ? <Notice tone="error" onDismiss={() => setError(null)}>{error}</Notice> : null}

      {(chip === "style" || chip === "skill") && tags.length ? (
        <section className="portfolio-strip-section">
          <StripHeading title={chip === "style" ? "Styles" : "Skills"} count={`${tags.filter((item) => clips.some((clip) => clip.kind === chip && clip.ref === item)).length}/${tags.length}`} hint="One clip per tag on your profile." />
          <div className="portfolio-strip">
            {tags.map((item) => {
              const clip = clips.find((entry) => entry.kind === chip && entry.ref === item);
              return (
                <button key={item} type="button" className="portfolio-thumb portfolio-thumb--video portfolio-media-card" aria-pressed={item === activeTag} onClick={() => setTag(item)}>
                  {clip ? <video src={clip.url} muted playsInline preload="metadata" /> : <Plus size={18} aria-hidden />}
                  <span className="portfolio-thumb__caption">{item}</span>
                  {clip && !pro ? <LockBadge /> : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {chip === "other" ? (
        <section className="portfolio-strip-section">
          <StripHeading title="Uploads" count={`${others.length}/${PORTFOLIO_LIMITS.otherVisuals}`} hint="Extra clips like performances, class footage, or behind the scenes." />
          <div className="portfolio-strip">
            <AddTile label="Add clip" onClick={() => pick(true)} disabled={!pro || pending || others.length >= PORTFOLIO_LIMITS.otherVisuals} locked={!pro} />
            {others.map((clip, index) => (
              <button key={clip.id} type="button" className="portfolio-thumb portfolio-thumb--video portfolio-media-card" aria-label={`Clip ${index + 1}`} aria-pressed={index === otherIndex} onClick={() => setOtherIndex(index)}>
                <video src={clip.url} muted playsInline preload="metadata" />
                <span className="portfolio-thumb__index">{index + 1}</span>
                {!pro ? <LockBadge /> : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
