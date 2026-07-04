"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Filter, PanelRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ActiveTalentPanel } from "@/components/talent-buyers/talent-navigator/ActiveTalentPanel";
import { AnimatedGridBackground } from "@/components/talent-buyers/talent-navigator/AnimatedGridBackground";
import {
  getNavigatorGridMetrics,
  TalentNavigatorGrid,
} from "@/components/talent-buyers/talent-navigator/TalentNavigatorGrid";
import "@/components/talent-buyers/talent-navigator/talent-navigator.css";
import {
  buildPreviewTalentRows,
  getPreviewDemoFinalFocus,
  NAVIGATOR_PREVIEW_DEMO_PATH,
  type NavigatorPreviewDemoAction,
} from "@/lib/marketing/talent-navigator-preview";
import { useNavigatorSlide } from "@/lib/talent-navigator/use-navigator-slide";

import "./talent-navigator-preview.css";

const DEMO_START_DELAY_MS = 900;
const DEMO_PAUSE_MS = 750;
const DETAILS_TAP_MS = 200;
const DETAILS_HOLD_MS = 20_000;
const CYCLE_RESTART_DELAY_MS = 900;
const IN_VIEW_THRESHOLD = 0.35;

const DEFAULT_PREVIEW_VIEWPORT = { width: 520, height: 320 };

export function TalentNavigatorPreview() {
  const reduceMotion = useReducedMotion();
  const rows = useMemo(() => buildPreviewTalentRows(), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const inViewRef = useRef(false);
  const [inView, setInView] = useState(false);
  const [viewport, setViewport] = useState(DEFAULT_PREVIEW_VIEWPORT);
  const [viewportReady, setViewportReady] = useState(false);
  const metrics = useMemo(
    () => getNavigatorGridMetrics(false, true, viewport),
    [viewport],
  );
  const {
    activeRowIndex,
    activeColIndex,
    activeColByRowId,
    trackOffsetY,
    activeRowOffsetX,
    slideInstant,
    navigate,
    handleSlideComplete,
    focusCell,
    resetNavigation,
    isSlidingRef,
  } = useNavigatorSlide(rows, metrics.stepX, metrics.stepY);

  const pathIndexRef = useRef(0);
  const pauseTimerRef = useRef<number | null>(null);
  const demoCompleteRef = useRef(false);
  const queueNextRef = useRef<(() => void) | null>(null);
  const navigateRef = useRef(navigate);
  const focusCellRef = useRef(focusCell);
  const resetNavigationRef = useRef(resetNavigation);
  const runDemoActionRef = useRef<(action: NavigatorPreviewDemoAction) => void>(() => undefined);
  const dismissDetailsAndRestartRef = useRef<() => void>(() => undefined);
  const startCycleRef = useRef<() => void>(() => undefined);

  navigateRef.current = navigate;
  focusCellRef.current = focusCell;
  resetNavigationRef.current = resetNavigation;

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTap, setDetailsTap] = useState(false);

  const demoFinalFocus = useMemo(
    () =>
      getPreviewDemoFinalFocus(
        NAVIGATOR_PREVIEW_DEMO_PATH,
        rows.length,
        rows[0]?.talent.length ?? 14,
        rows.map((row) => row.id),
      ),
    [rows],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const visible = entry.isIntersecting && entry.intersectionRatio >= IN_VIEW_THRESHOLD;
        inViewRef.current = visible;
        setInView(visible);
      },
      { threshold: [0, IN_VIEW_THRESHOLD, 0.6, 0.85] },
    );

    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width < 1 || rect.height < 1) return;
      setViewport({ width: rect.width, height: rect.height });
      setViewportReady(true);
      observer.disconnect();
    });

    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const clearPauseTimer = useCallback(() => {
    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }, []);

  const dismissDetailsAndRestart = useCallback(() => {
    if (!inViewRef.current) return;

    clearPauseTimer();
    setDetailsTap(true);
    pauseTimerRef.current = window.setTimeout(() => {
      setDetailsTap(false);
      setDetailsOpen(false);
      demoCompleteRef.current = false;
      pathIndexRef.current = 0;
      resetNavigationRef.current();

      pauseTimerRef.current = window.setTimeout(() => {
        if (!inViewRef.current || demoCompleteRef.current) return;
        runDemoActionRef.current(NAVIGATOR_PREVIEW_DEMO_PATH[0]);
      }, CYCLE_RESTART_DELAY_MS);
    }, DETAILS_TAP_MS);
  }, [clearPauseTimer]);

  dismissDetailsAndRestartRef.current = dismissDetailsAndRestart;

  const finishOnDetails = useCallback(() => {
    clearPauseTimer();
    pathIndexRef.current = NAVIGATOR_PREVIEW_DEMO_PATH.length;
    setDetailsTap(true);
    pauseTimerRef.current = window.setTimeout(() => {
      setDetailsTap(false);
      setDetailsOpen(true);
      demoCompleteRef.current = true;

      pauseTimerRef.current = window.setTimeout(() => {
        if (!inViewRef.current) return;
        dismissDetailsAndRestartRef.current();
      }, DETAILS_HOLD_MS);
    }, DETAILS_TAP_MS);
  }, [clearPauseTimer]);

  const runDemoAction = useCallback(
    (action: NavigatorPreviewDemoAction) => {
      if (demoCompleteRef.current || !inViewRef.current) return;

      if (action === "open-details") {
        finishOnDetails();
        return;
      }

      navigateRef.current(action);
      pathIndexRef.current += 1;
    },
    [finishOnDetails],
  );

  runDemoActionRef.current = runDemoAction;

  const queueNextMove = useCallback(() => {
    if (demoCompleteRef.current || !inViewRef.current) return;

    const nextIndex = pathIndexRef.current;
    if (nextIndex >= NAVIGATOR_PREVIEW_DEMO_PATH.length) return;

    clearPauseTimer();
    pauseTimerRef.current = window.setTimeout(() => {
      if (isSlidingRef.current || demoCompleteRef.current || !inViewRef.current) return;
      runDemoActionRef.current(NAVIGATOR_PREVIEW_DEMO_PATH[nextIndex]);
    }, DEMO_PAUSE_MS);
  }, [clearPauseTimer, isSlidingRef]);

  queueNextRef.current = queueNextMove;

  const onSlideComplete = useCallback(() => {
    handleSlideComplete();
    if (demoCompleteRef.current || !inViewRef.current) return;
    queueNextRef.current?.();
  }, [handleSlideComplete]);

  const startCycle = useCallback(() => {
    clearPauseTimer();
    pathIndexRef.current = 0;
    demoCompleteRef.current = false;
    setDetailsOpen(false);
    setDetailsTap(false);
    resetNavigationRef.current();

    if (reduceMotion) {
      focusCellRef.current(demoFinalFocus.rowIndex, demoFinalFocus.colIndex);
      finishOnDetails();
      return;
    }

    pauseTimerRef.current = window.setTimeout(() => {
      if (!inViewRef.current) return;
      runDemoActionRef.current(NAVIGATOR_PREVIEW_DEMO_PATH[0]);
    }, DEMO_START_DELAY_MS);
  }, [clearPauseTimer, demoFinalFocus.colIndex, demoFinalFocus.rowIndex, finishOnDetails, reduceMotion]);

  startCycleRef.current = startCycle;

  useEffect(() => {
    if (!viewportReady || !inView || rows.length === 0) {
      if (!inView) clearPauseTimer();
      return;
    }

    startCycleRef.current();

    return () => {
      clearPauseTimer();
    };
  }, [clearPauseTimer, inView, rows.length, viewportReady]);

  if (!rows.length) return null;

  const currentRow = rows[activeRowIndex];
  const activeTalent = currentRow?.talent[activeColIndex] ?? null;

  return (
    <div ref={rootRef} className="talent-navigator-preview pointer-events-none select-none">
      <div className="talent-navigator-preview__frame">
        <header className="talent-navigator-preview__chrome">
          <div className="talent-navigator-preview__chrome-start">
            <span className="talent-navigator-preview__pill">
              <Filter className="size-3" aria-hidden />
              Filters
            </span>
          </div>

          <div className="talent-navigator-preview__chrome-center">
            <motion.p
              key={currentRow?.id ?? "browse"}
              className="talent-navigator-preview__category"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
            >
              {currentRow?.label ?? "Browse talent"}
            </motion.p>
          </div>

          <div className="talent-navigator-preview__chrome-end">
            <motion.span
              className={`talent-navigator-preview__pill${
                detailsOpen ? " talent-navigator-preview__pill--active" : ""
              }`}
              animate={{ scale: detailsTap ? 0.94 : 1 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            >
              <PanelRight className="size-3" aria-hidden />
              Details
            </motion.span>
          </div>
        </header>

        <div ref={stageRef} className="talent-navigator-preview__stage">
          <AnimatedGridBackground />
          <TalentNavigatorGrid
            rows={rows}
            activeRowIndex={activeRowIndex}
            activeColByRowId={activeColByRowId}
            trackOffsetY={trackOffsetY}
            activeRowOffsetX={activeRowOffsetX}
            slideInstant={slideInstant}
            preview
            previewViewport={viewport}
            showControls={false}
            onSlideComplete={onSlideComplete}
            onFocusCell={focusCell}
            onOpenProfile={() => undefined}
          />

          <AnimatePresence initial={false}>
            {detailsOpen && activeTalent ? (
              <div key="details-slot" className="talent-navigator-preview__details-slot">
                <div className="talent-navigator-preview__details-anchor">
                  <motion.div
                    className="talent-navigator-preview__details-panel"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 18 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ActiveTalentPanel
                      talent={activeTalent}
                      open={true}
                      compact
                      variant="sidebar"
                    />
                  </motion.div>
                </div>
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <span className="sr-only">Preview of talent navigator search grid</span>
    </div>
  );
}
