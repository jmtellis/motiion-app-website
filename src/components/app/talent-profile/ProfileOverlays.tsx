"use client";

import { ChevronLeft, ChevronRight, Download, ExternalLink, Link2, Share, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";

/**
 * Bottom sheet over the whole side panel (header included), like the iOS
 * medium-detent sheets. Marked as a dialog so Escape closes it before the panel.
 */
export function PanelSheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog open onClose={onClose} label={title} className="profile-sheet-dialog">
      <section className="profile-sheet__card workspace-side-panel" data-portfolio-dialog>
        <header className="profile-sheet__header workspace-side-panel__header">
          <div className="workspace-side-panel__title">
            <h3>{title}</h3>
          </div>
          <div className="workspace-side-panel__actions">
            <button
              type="button"
              className="workspace-notifications__close"
              aria-label={`Close ${title.toLowerCase()}`}
              onClick={onClose}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </header>
        <div className="profile-sheet__body workspace-side-panel__body">{children}</div>
        {footer ? <footer className="profile-sheet__footer">{footer}</footer> : null}
      </section>
    </Dialog>
  );
}

function fileNameFor(url: string, name: string, index: number) {
  const extension = url.split("?")[0].match(/\.(jpe?g|png|webp|heic|gif)$/i)?.[1] ?? "jpg";
  const base = name.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "headshot";
  return `${base}-headshot-${index + 1}.${extension}`;
}

export function HeadshotViewer({
  urls,
  name,
  initialIndex,
  onClose,
}: {
  urls: string[];
  name: string;
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [notice, setNotice] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const url = urls[index];
  const count = urls.length;

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight" && count > 1) {
        setIndex((current) => (current + 1) % count);
      } else if (event.key === "ArrowLeft" && count > 1) {
        setIndex((current) => (current - 1 + count) % count);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [count]);

  useEffect(() => {
    if (!notice) return;
    const handle = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(handle);
  }, [notice]);

  async function share() {
    const title = `${name} — headshot`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Image unavailable");
      const blob = await response.blob();
      const file = new File([blob], fileNameFor(url, name, index), { type: blob.type || "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch {
        /* Dismissed share sheet. */
      }
      return;
    }
    await copyLink();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Image link copied");
    } catch {
      setNotice("Could not copy. Use Open original to copy the image address.");
    }
  }

  async function download() {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Image unavailable");
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = fileNameFor(url, name, index);
      anchor.click();
      URL.revokeObjectURL(href);
      setNotice("Headshot downloaded");
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <Dialog open onClose={onClose} label={`${name} headshots`} className="headshot-dialog">
    <div className="headshot-viewer" data-portfolio-dialog>
      <header className="headshot-viewer__bar">
        <p>
          <strong>{name}</strong>
          {count > 1 ? <span>{index + 1} of {count}</span> : null}
        </p>
        <div className="headshot-viewer__actions">
          <button type="button" onClick={() => void share()}>
            <Share size={16} aria-hidden /> Share
          </button>
          <button type="button" onClick={() => void download()}>
            <Download size={16} aria-hidden /> Download
          </button>
          <button type="button" onClick={() => void copyLink()} aria-label="Copy image link" title="Copy image link">
            <Link2 size={16} aria-hidden />
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Open original in a new tab" title="Open original">
            <ExternalLink size={16} aria-hidden />
          </a>
          <button ref={closeRef} type="button" className="headshot-viewer__close" onClick={onClose} aria-label="Close headshots">
            <X size={18} aria-hidden />
          </button>
        </div>
      </header>
      <div className="headshot-viewer__stage" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        {count > 1 ? (
          <button type="button" className="headshot-viewer__nav headshot-viewer__nav--prev" aria-label="Previous headshot" onClick={() => setIndex((index - 1 + count) % count)}>
            <ChevronLeft size={22} aria-hidden />
          </button>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={url} src={url} alt={`${name}, headshot ${index + 1} of ${count}`} />
        {count > 1 ? (
          <button type="button" className="headshot-viewer__nav headshot-viewer__nav--next" aria-label="Next headshot" onClick={() => setIndex((index + 1) % count)}>
            <ChevronRight size={22} aria-hidden />
          </button>
        ) : null}
      </div>
      {count > 1 ? (
        <div className="headshot-viewer__thumbs" role="group" aria-label="Headshots">
          {urls.map((item, itemIndex) => (
            <button
              key={item}
              type="button"
              aria-pressed={itemIndex === index}
              aria-label={`Headshot ${itemIndex + 1}`}
              onClick={() => setIndex(itemIndex)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      {notice ? <p className="headshot-viewer__notice" role="status">{notice}</p> : null}
    </div>
    </Dialog>
  );
}

export type ProfileVideoClip = {
  id: string;
  url: string;
  label: string;
};

/** Full-screen focused video viewer — same chrome pattern as HeadshotViewer. */
export function VideoViewer({
  clips,
  name,
  initialIndex,
  onClose,
}: {
  clips: ProfileVideoClip[];
  name: string;
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(Math.min(Math.max(initialIndex, 0), Math.max(clips.length - 1, 0)));
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clip = clips[index];
  const count = clips.length;

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight" && count > 1) {
        setIndex((current) => (current + 1) % count);
      } else if (event.key === "ArrowLeft" && count > 1) {
        setIndex((current) => (current - 1 + count) % count);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    node.load();
    void node.play().catch(() => {
      /* Autoplay may be blocked; controls remain available. */
    });
  }, [clip?.url]);

  if (!clip) return null;

  return (
    <Dialog open onClose={onClose} label={`${name} visuals`} className="headshot-dialog">
      <div className="headshot-viewer video-viewer" data-portfolio-dialog>
        <header className="headshot-viewer__bar">
          <p>
            <strong>{clip.label}</strong>
            {count > 1 ? <span>{index + 1} of {count}</span> : null}
          </p>
          <div className="headshot-viewer__actions">
            <button ref={closeRef} type="button" className="headshot-viewer__close" onClick={onClose} aria-label="Close visuals">
              <X size={18} aria-hidden />
            </button>
          </div>
        </header>
        <div className="headshot-viewer__stage video-viewer__stage" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          {count > 1 ? (
            <button type="button" className="headshot-viewer__nav headshot-viewer__nav--prev" aria-label="Previous video" onClick={() => setIndex((index - 1 + count) % count)}>
              <ChevronLeft size={22} aria-hidden />
            </button>
          ) : null}
          <video
            key={clip.url}
            ref={videoRef}
            className="video-viewer__player"
            src={clip.url}
            controls
            playsInline
            autoPlay
          />
          {count > 1 ? (
            <button type="button" className="headshot-viewer__nav headshot-viewer__nav--next" aria-label="Next video" onClick={() => setIndex((index + 1) % count)}>
              <ChevronRight size={22} aria-hidden />
            </button>
          ) : null}
        </div>
        {count > 1 ? (
          <div className="headshot-viewer__thumbs video-viewer__thumbs" role="group" aria-label="Visuals">
            {clips.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={itemIndex === index}
                aria-label={item.label}
                onClick={() => setIndex(itemIndex)}
              >
                <video src={item.url} muted playsInline preload="metadata" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
