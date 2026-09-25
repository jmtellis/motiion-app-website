"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from "react";

export const SIDEBAR_RAIL = 64;
const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 208;
const MAX_WIDTH = 360;

export function normalizeSidebarWidth(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_WIDTH;
  if (value < 128) return SIDEBAR_RAIL;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
}

export function useWorkspaceSidebar(storageKey: string) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const expandedWidth = useRef(DEFAULT_WIDTH);
  const drag = useRef<{ x: number; width: number } | null>(null);

  useEffect(() => {
    // Hydrate the browser-only preference on the next frame, after server markup matches.
    const frame = window.requestAnimationFrame(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null) {
        const preference = JSON.parse(stored);
        const savedWidth = typeof preference === "number" ? preference : preference?.width;
        const parsed = normalizeSidebarWidth(Number(savedWidth));
        const savedExpanded = normalizeSidebarWidth(Number(preference?.expandedWidth ?? DEFAULT_WIDTH));
        setWidth(parsed);
        expandedWidth.current = parsed !== SIDEBAR_RAIL ? parsed : savedExpanded === SIDEBAR_RAIL ? DEFAULT_WIDTH : savedExpanded;
      }
    } catch { /* Storage is optional in private/restricted browsers. */ }
    setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);

  useEffect(() => {
    if (!ready || dragging) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify({ width, expandedWidth: expandedWidth.current })); } catch { /* Keep navigation usable. */ }
  }, [width, ready, dragging, storageKey]);

  function resize(next: number) {
    const value = normalizeSidebarWidth(next);
    if (value !== SIDEBAR_RAIL) expandedWidth.current = value;
    setWidth(value);
  }

  function toggle() { resize(width === SIDEBAR_RAIL ? expandedWidth.current : SIDEBAR_RAIL); }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag.current = { x: event.clientX, width };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current) resize(drag.current.width + event.clientX - drag.current.x);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => resize(width <= MIN_WIDTH ? SIDEBAR_RAIL : width - 16),
      ArrowRight: () => resize(width === SIDEBAR_RAIL ? MIN_WIDTH : width + 16),
      Home: () => resize(SIDEBAR_RAIL), End: () => resize(MAX_WIDTH),
      Enter: toggle, " ": toggle,
    };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  };
  return {
    width, collapsed: width === SIDEBAR_RAIL, dragging, toggle,
    style: { "--workspace-sidebar-width": `${width}px`, "--buyer-sidebar-width": `${width}px` } as CSSProperties,
    separatorProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp,
      onLostPointerCapture: () => { drag.current = null; setDragging(false); }, onKeyDown, onDoubleClick: toggle },
  };
}

export function WorkspaceSidebarResize({ sidebar, controls }: {
  sidebar: ReturnType<typeof useWorkspaceSidebar>; controls: string;
}) {
  return <div className="workspace-sidebar-resize" role="separator" tabIndex={0}
    aria-label="Resize sidebar" aria-orientation="vertical" aria-controls={controls}
    aria-valuemin={SIDEBAR_RAIL} aria-valuemax={MAX_WIDTH} aria-valuenow={sidebar.width}
    aria-valuetext={sidebar.collapsed ? "Collapsed" : `${sidebar.width} pixels`}
    title="Drag to resize · Double-click to collapse" {...sidebar.separatorProps} />;
}
