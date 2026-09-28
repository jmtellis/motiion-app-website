"use client";

import { ChevronLeft, ChevronRight, Download, ExternalLink, Link2, Share, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  const [host, setHost] = useState<HTMLElement | null>(null);
  const anchorRef = useCallback((node: HTMLSpanElement | null) => {
    if (node) setHost(node.closest<HTMLElement>(".workspace-side-panel"));
  }, []);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <span ref={anchorRef} hidden />
      {host
        ? createPortal(
            <div className="profile-sheet" data-portfolio-dialog>
              <button type="button" className="profile-sheet__backdrop" aria-label="Close" onClick={onClose} />
              <section className="profile-sheet__card" role="dialog" aria-modal="true" aria-label={title}>
                <span className="profile-sheet__grabber" aria-hidden />
                <header className="profile-sheet__header">
                  <h3>{title}</h3>
                  <button type="button" className="profile-sheet__done" onClick={onClose}>Done</button>
                </header>
                <div className="profile-sheet__body">{children}</div>
                {footer ? <footer className="profile-sheet__footer">{footer}</footer> : null}
              </section>
            </div>,
            host,
          )
        : null}
    </>
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
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const url = urls[index];
  const count = urls.length;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === "ArrowRight") {
        setIndex((current) => (current + 1) % count);
      } else if (event.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + count) % count);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
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
    await navigator.clipboard.writeText(url);
    setNotice("Image link copied");
  }

  async function download() {
    try {
      const response = await fetch(url);
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

  return createPortal(
    <div className="headshot-viewer" role="dialog" aria-modal="true" aria-label={`${name} headshots`} data-portfolio-dialog>
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
        <div className="headshot-viewer__thumbs" role="tablist" aria-label="Headshots">
          {urls.map((item, itemIndex) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={itemIndex === index}
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
    </div>,
    document.body,
  );
}
