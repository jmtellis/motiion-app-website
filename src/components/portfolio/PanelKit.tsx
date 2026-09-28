"use client";

import { Lock, Plus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { CARD_ASPECT, loadImage, renderCrop, type CropRect } from "./media";

type DragState = { index: number; start: number; delta: number; target: number; moved: boolean };

/** Pointer drag-to-reorder for a strip or list; a press without movement counts as a tap. */
export function usePointerReorder({
  axis,
  onReorder,
  onTap,
}: {
  axis: "x" | "y";
  onReorder: (from: number, to: number) => void;
  onTap?: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const bind = (index: number, options: { disabled?: boolean } = {}) => ({
    "data-reorder-index": index,
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0 || options.disabled) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({ index, start: axis === "x" ? event.clientX : event.clientY, delta: 0, target: index, moved: false });
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      if (!drag || drag.index !== index) return;
      const position = axis === "x" ? event.clientX : event.clientY;
      const delta = position - drag.start;
      const moved = drag.moved || Math.abs(delta) > 6;
      if (!moved) return;
      let target = drag.target;
      containerRef.current?.querySelectorAll<HTMLElement>("[data-reorder-index]").forEach((node) => {
        const rect = node.getBoundingClientRect();
        const low = axis === "x" ? rect.left : rect.top;
        const high = axis === "x" ? rect.right : rect.bottom;
        if (position >= low && position <= high) target = Number(node.dataset.reorderIndex);
      });
      setDrag({ ...drag, delta, target, moved });
    },
    onPointerUp() {
      if (!drag) return;
      if (drag.moved && drag.target !== drag.index) onReorder(drag.index, drag.target);
      else if (!drag.moved) onTap?.(index);
      setDrag(null);
    },
    onPointerCancel() {
      setDrag(null);
    },
    style: (drag?.index === index && drag.moved
      ? { transform: axis === "x" ? `translateX(${drag.delta}px)` : `translateY(${drag.delta}px)`, zIndex: 5 }
      : undefined) as CSSProperties | undefined,
    "data-dragging": drag?.index === index && drag.moved ? true : undefined,
    "data-drop-target": drag?.moved && drag.target === index && drag.index !== index ? true : undefined,
  });

  return { containerRef, bind, dragging: Boolean(drag?.moved) };
}

export function moveItem<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

export function SaveButton({ dirty, pending, onClick, label = "Save" }: { dirty: boolean; pending: boolean; onClick: () => void; label?: string }) {
  return (
    <button type="button" className="portfolio-panel-save" disabled={!dirty || pending} onClick={onClick}>
      {pending ? "Saving…" : label}
    </button>
  );
}

export function HeroCard({ children, square = false, className = "" }: { children: ReactNode; square?: boolean; className?: string }) {
  return <div className={`portfolio-hero ${square ? "portfolio-hero--wide" : ""} ${className}`}>{children}</div>;
}

export function EmptyHero({ icon, title, detail }: { icon: ReactNode; title: string; detail?: string }) {
  return (
    <div className="portfolio-hero__empty">
      {icon}
      <p>{title}</p>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="portfolio-action-bar" role="toolbar">{children}</div>;
}

export function ActionButton({ label, onClick, disabled, children, tone }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode; tone?: "danger" }) {
  return (
    <button type="button" className="portfolio-action" aria-label={label} title={label} disabled={disabled} onClick={onClick} data-tone={tone}>
      {children}
    </button>
  );
}

export function StripHeading({ title, count, hint }: { title: string; count?: string; hint?: string }) {
  return (
    <div className="portfolio-strip-heading">
      <h3>
        {title}
        {count ? <span>{count}</span> : null}
      </h3>
      {hint ? <p>{hint}</p> : null}
    </div>
  );
}

export function AddTile({ label, onClick, disabled, locked }: { label: string; onClick: () => void; disabled?: boolean; locked?: boolean }) {
  return (
    <button type="button" className="portfolio-strip-add portfolio-media-card" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {locked ? <Lock size={18} aria-hidden /> : <Plus size={20} aria-hidden />}
    </button>
  );
}

export function LockBadge() {
  return (
    <span className="portfolio-lock" aria-hidden>
      <Lock size={14} />
    </span>
  );
}

export function Notice({ tone = "info", children, onDismiss }: { tone?: "info" | "error" | "success"; children: ReactNode; onDismiss?: () => void }) {
  return (
    <div className="portfolio-notice" data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      <div>{children}</div>
      {onDismiss ? (
        <button type="button" aria-label="Dismiss" onClick={onDismiss}>
          <X size={14} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export function ConfirmBar({ message, confirmLabel, onConfirm, onCancel }: { message: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="portfolio-confirm" role="alertdialog" aria-label={message}>
      <p>{message}</p>
      <div>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" data-tone="danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  );
}

/** Revokes blob URLs created for unsaved media when a panel unmounts. */
export function useObjectUrls() {
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);
  return useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urls.current.push(url);
    return url;
  }, []);
}

export function CropDialog({ src, title, onCancel, onApply }: { src: string; title: string; onCancel: () => void; onApply: (blob: Blob) => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    let active = true;
    loadImage(src).then(
      (loaded) => active && setImage(loaded),
      (reason: Error) => active && setError(reason.message),
    );
    return () => {
      active = false;
    };
  }, [src]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setFrame({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const base = image && frame.width ? Math.max(frame.width / image.naturalWidth, frame.height / image.naturalHeight) : 1;
  const scale = base * zoom;
  const renderWidth = image ? image.naturalWidth * scale : 0;
  const renderHeight = image ? image.naturalHeight * scale : 0;
  const limitX = Math.max(0, (renderWidth - frame.width) / 2);
  const limitY = Math.max(0, (renderHeight - frame.height) / 2);
  const clamped = { x: Math.max(-limitX, Math.min(limitX, offset.x)), y: Math.max(-limitY, Math.min(limitY, offset.y)) };

  async function apply() {
    if (!image || !frame.width) return;
    const left = (frame.width - renderWidth) / 2 + clamped.x;
    const top = (frame.height - renderHeight) / 2 + clamped.y;
    const rect: CropRect = { x: -left / scale, y: -top / scale, width: frame.width / scale, height: frame.height / scale };
    setBusy(true);
    try {
      onApply(await renderCrop(image, rect));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not crop that image.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="portfolio-dialog" data-portfolio-dialog role="dialog" aria-modal="true" aria-label={title}>
      <div className="portfolio-dialog__card">
        <header>
          <h2>{title}</h2>
          <button type="button" className="workspace-notifications__close" aria-label="Cancel crop" onClick={onCancel}>
            <X size={18} aria-hidden />
          </button>
        </header>
        <div
          ref={frameRef}
          className="portfolio-crop"
          style={{ aspectRatio: String(CARD_ASPECT) }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { x: event.clientX, y: event.clientY, ox: clamped.x, oy: clamped.y };
          }}
          onPointerMove={(event) => {
            const start = dragRef.current;
            if (start) setOffset({ x: start.ox + event.clientX - start.x, y: start.oy + event.clientY - start.y });
          }}
          onPointerUp={() => (dragRef.current = null)}
          onPointerCancel={() => (dragRef.current = null)}
          onWheel={(event) => setZoom((value) => Math.min(4, Math.max(1, value - event.deltaY * 0.002)))}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              style={{
                width: renderWidth,
                height: renderHeight,
                transform: `translate(calc(-50% + ${clamped.x}px), calc(-50% + ${clamped.y}px))`,
              }}
            />
          ) : null}
          <span className="portfolio-crop__grid" aria-hidden />
        </div>
        <label className="portfolio-crop__zoom">
          <span>Zoom</span>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
        </label>
        <p className="portfolio-dialog__hint">Drag to reposition. Scroll or use the slider to zoom.</p>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <footer>
          <button type="button" className="portfolio-button-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="portfolio-panel-save" disabled={!image || busy} onClick={() => void apply()}>
            {busy ? "Applying…" : "Apply crop"}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
