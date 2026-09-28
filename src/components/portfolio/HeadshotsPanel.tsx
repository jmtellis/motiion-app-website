"use client";

import { Camera, ChevronDown, Crop, RefreshCw, Share2, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { unlockedCount, PORTFOLIO_LIMITS } from "@/lib/app/portfolio-limits";
import { savePortfolioHeadshots } from "@/app/portfolio/material-actions";

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

const LABELS = [
  "Theatrical",
  "Commercial",
  "Dance Action",
  "Full Body",
  "Three-Quarter",
  "Editorial",
  "Fitness/Athletic",
  "Character",
  "Natural Light",
  "Polaroid/Slate",
];

type Shot = {
  key: string;
  url: string;
  original: string;
  label: string;
  pending?: { display: Blob; source?: Blob };
};

export function HeadshotsPanel({ owner, actionsHost, onDirtyChange, onSaved }: PortfolioPanelProps) {
  const initial = useMemo<Shot[]>(
    () =>
      owner.headshotUrls.map((url, index) => ({
        key: url,
        url,
        original: owner.headshotOriginalUrls[index] || url,
        label: owner.headshotLabels[index] ?? "",
      })),
    [owner],
  );
  const [baseline, setBaseline] = useState(initial);
  const [shots, setShots] = useState(initial);
  const [selected, setSelected] = useState(Math.max(0, initial.length - 1));
  const [cropping, setCropping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [labelMenu, setLabelMenu] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const objectUrl = useObjectUrls();

  const unlocked = unlockedCount(owner.plan, "headshots");
  const current = shots[selected];
  const dirty =
    shots.some((shot) => shot.pending) ||
    JSON.stringify(shots.map(({ url, label }) => [url, label])) !== JSON.stringify(baseline.map(({ url, label }) => [url, label]));
  useReportDirty(dirty, onDirtyChange);

  const reorder = usePointerReorder({
    axis: "x",
    onTap: (index) => setSelected(index),
    onReorder: (from, to) => {
      setShots((items) => moveItem(items, from, to));
      setSelected(to);
    },
  });

  function update(index: number, patch: Partial<Shot>) {
    setShots((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function addFiles(files: File[]) {
    const room = unlocked - shots.length;
    if (room <= 0) {
      setError(owner.plan === "pro" ? `You can keep up to ${PORTFOLIO_LIMITS.headshots.pro} headshots.` : `Free portfolios include ${unlocked} headshots. Upgrade to Pro in the Motiion app for up to ${PORTFOLIO_LIMITS.headshots.pro}.`);
      return;
    }
    setError(null);
    setPreparing(true);
    try {
      const prepared = await Promise.all(files.slice(0, room).map((file) => prepareCardImage(file)));
      const added = prepared.map(({ display, source }) => {
        const url = objectUrl(display);
        return { key: url, url, original: objectUrl(source), label: "", pending: { display, source } };
      });
      setShots((items) => [...items, ...added]);
      setSelected(shots.length + added.length - 1);
      if (files.length > room) setError(`Only ${room} more headshot${room === 1 ? "" : "s"} fit on your plan.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not add that image.");
    } finally {
      setPreparing(false);
    }
  }

  async function replace(file: File) {
    setError(null);
    setPreparing(true);
    try {
      const { display, source } = await prepareCardImage(file);
      const url = objectUrl(display);
      update(selected, { key: url, url, original: objectUrl(source), pending: { display, source } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not replace that image.");
    } finally {
      setPreparing(false);
    }
  }

  async function share() {
    if (!current || current.pending) return;
    try {
      if (typeof navigator.share === "function") await navigator.share({ title: `${owner.displayName} headshot`, url: current.url });
      else {
        await navigator.clipboard.writeText(current.url);
        onSaved("Headshot link copied");
      }
    } catch {
      // Share sheet dismissed.
    }
  }

  async function save() {
    if (!shots.length) {
      setError("Add at least one headshot before saving.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const stamp = Date.now();
      const folder = owner.userId.toLowerCase();
      const uploaded = await Promise.all(
        shots.map(async (shot, slot) => {
          if (!shot.pending) return shot;
          const base = `${folder}/headshot_${slot}_${stamp}`;
          const [url, original] = await Promise.all([
            uploadPublicObject("headshots", `${base}.jpg`, shot.pending.display, "image/jpeg"),
            shot.pending.source
              ? uploadPublicObject("headshots", `${base}_source.jpg`, shot.pending.source, "image/jpeg")
              : Promise.resolve(shot.original),
          ]);
          return { ...shot, url, original, pending: undefined };
        }),
      );
      const result = await savePortfolioHeadshots({
        urls: uploaded.map((shot) => shot.url),
        originals: uploaded.map((shot) => shot.original),
        labels: uploaded.map((shot) => shot.label),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShots(uploaded);
      setBaseline(uploaded);
      onSaved("Headshots saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your headshots.");
    } finally {
      setPending(false);
    }
  }

  const locked = selected >= unlocked;

  return (
    <div className="portfolio-panel-stack">
      <PanelActions host={actionsHost}>
        <SaveButton dirty={dirty} pending={pending} onClick={() => void save()} />
      </PanelActions>

      <input ref={addInput} type="file" accept="image/jpeg,image/png,image/heic,image/webp" multiple hidden onChange={(event) => { void addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
      <input ref={replaceInput} type="file" accept="image/jpeg,image/png,image/heic,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void replace(file); event.target.value = ""; }} />

      <HeroCard>
        {current ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={`Headshot ${selected + 1}`} draggable={false} className={locked ? "is-locked" : undefined} />
            {locked ? (
              <div className="portfolio-hero__locked">
                <LockBadge />
                <p>Upgrade to Pro in the Motiion app to show this headshot.</p>
              </div>
            ) : null}
            <div className="portfolio-hero__footer">
              <button type="button" className="portfolio-pill" aria-haspopup="listbox" aria-expanded={labelMenu} onClick={() => setLabelMenu((open) => !open)}>
                {current.label || "Untagged"}
                <ChevronDown size={14} aria-hidden />
              </button>
              {selected === 0 ? <span className="portfolio-pill portfolio-pill--static">Primary</span> : null}
            </div>
            {labelMenu ? (
              <div className="portfolio-menu" role="listbox" aria-label={`Label for shot ${selected + 1}`}>
                {["", ...LABELS].map((label) => (
                  <button key={label || "untagged"} type="button" role="option" className="portfolio-menu-row" aria-selected={current.label === label} onClick={() => { update(selected, { label }); setLabelMenu(false); }}>
                    {label || "Untagged"}
                  </button>
                ))}
                <form
                  className="portfolio-menu__custom"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!customLabel.trim()) return;
                    update(selected, { label: customLabel.trim().slice(0, 60) });
                    setCustomLabel("");
                    setLabelMenu(false);
                  }}
                >
                  <input value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} placeholder="Custom label" maxLength={60} />
                  <button type="submit">Apply</button>
                </form>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyHero icon={<Camera size={28} strokeWidth={1.5} />} title="Add your first headshot" detail="JPEG, PNG, or HEIC. Your first photo is your primary headshot." />
        )}
      </HeroCard>

      <ActionBar>
        {current ? (
          <>
            <ActionButton label="Replace headshot" onClick={() => replaceInput.current?.click()} disabled={preparing || pending}>
              <RefreshCw size={18} aria-hidden />
            </ActionButton>
            <ActionButton label="Crop headshot" onClick={() => setCropping(true)} disabled={preparing || pending}>
              <Crop size={18} aria-hidden />
            </ActionButton>
            <ActionButton label="Share headshot" onClick={() => void share()} disabled={Boolean(current.pending)}>
              <Share2 size={18} aria-hidden />
            </ActionButton>
            <ActionButton label="Delete headshot" tone="danger" onClick={() => setConfirmDelete(true)} disabled={pending}>
              <Trash2 size={18} aria-hidden />
            </ActionButton>
          </>
        ) : (
          <button type="button" className="portfolio-panel-save" onClick={() => addInput.current?.click()} disabled={preparing}>
            {preparing ? "Preparing…" : "Add headshot"}
          </button>
        )}
      </ActionBar>

      {confirmDelete ? (
        <ConfirmBar
          message="Delete headshot? This removes the image and its label from your set. Save afterward to keep the change."
          confirmLabel="Delete"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setShots((items) => items.filter((_, index) => index !== selected));
            setSelected((index) => Math.max(0, Math.min(index, shots.length - 2)));
            setConfirmDelete(false);
          }}
        />
      ) : null}
      {error ? <Notice tone="error" onDismiss={() => setError(null)}>{error}</Notice> : null}

      <section className="portfolio-strip-section">
        <StripHeading
          title="Uploads"
          count={`${shots.length}/${owner.plan === "pro" ? PORTFOLIO_LIMITS.headshots.pro : unlocked}`}
          hint="Drag to reorder. Your first headshot is the one casting teams see first."
        />
        <div className="portfolio-strip" ref={reorder.containerRef}>
          <AddTile label="Add headshots" onClick={() => addInput.current?.click()} disabled={preparing || pending} locked={shots.length >= unlocked} />
          {shots.map((shot, index) => (
            <button
              key={shot.key}
              type="button"
              className="portfolio-thumb portfolio-media-card"
              aria-label={`Headshot ${index + 1}${index === 0 ? ", primary" : ""}${shot.label ? `, ${shot.label}` : ""}`}
              aria-pressed={index === selected}
              {...reorder.bind(index)}
              onClick={(event) => event.detail === 0 && setSelected(index)}
              onKeyDown={(event) => {
                if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
                event.preventDefault();
                const to = index + (event.key === "ArrowLeft" ? -1 : 1);
                if (to < 0 || to >= shots.length) return;
                setShots((items) => moveItem(items, index, to));
                setSelected(to);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot.url} alt="" draggable={false} />
              <span className="portfolio-thumb__index">{index + 1}</span>
              {index >= unlocked ? <LockBadge /> : null}
            </button>
          ))}
        </div>
      </section>

      {cropping && current ? (
        <CropDialog
          src={current.original}
          title="Crop headshot"
          onCancel={() => setCropping(false)}
          onApply={(blob) => {
            const url = objectUrl(blob);
            update(selected, { url, key: current.key, pending: { display: blob, source: current.pending?.source } });
            setCropping(false);
          }}
        />
      ) : null}
    </div>
  );
}
