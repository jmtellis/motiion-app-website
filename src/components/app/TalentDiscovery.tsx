"use client";

import { discoverDetailHref, discoverReturnHref } from "@/lib/app/discover-paths";
import { useMobileDiscover } from "@/lib/talent-navigator/use-mobile-discover";
import { useDiscoverIdle } from "@/lib/talent-navigator/use-discover-idle";
import { LayoutGrid, List, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DiscoverProfilePanel } from "@/components/app/DiscoverProfilePanel";
import { DiscoverSaved } from "@/components/app/DiscoverSaved";
import { DiscoverSearchBar } from "@/components/app/DiscoverSearchBar";
import { DiscoverTalentProvider } from "@/components/app/discover-selection";
import {
  TalentNavigatorGrid,
  MOBILE_GRID_METRICS,
  NAVIGATOR_STEP_X,
  NAVIGATOR_STEP_Y,
} from "@/components/talent-buyers/talent-navigator/TalentNavigatorGrid";
import { SegmentedControl } from "@/components/talent-buyers/dashboard/SegmentedControl";
import { buildTalentRows } from "@/lib/talent-navigator/rows";
import { useNavigatorSlide, type NavigatorDirection } from "@/lib/talent-navigator/use-navigator-slide";
import {
  EMPTY_NAVIGATOR_FILTERS,
  type Talent,
  type TalentNavigatorInitialData,
} from "@/lib/talent-navigator/types";
import "@/components/talent-buyers/talent-navigator/talent-navigator.css";
import { ProductEmptyState } from "@/components/ui/EmptyState";

export type DiscoverMode = "featured" | "discover" | "browse" | "saved";
export type ExploreLayout = "navigator" | "list";

function resolveMode(mode: DiscoverMode): Exclude<DiscoverMode, "browse"> {
  return mode === "browse" ? "discover" : mode;
}

function resolveLayout(mode: DiscoverMode, layout?: ExploreLayout): ExploreLayout {
  if (layout) return layout;
  return mode === "browse" ? "list" : "navigator";
}

/** Same discovery canvas as the industry workspace; no hiring-only actions. */
export function TalentDiscovery({
  initialData,
  currentUserId,
  keyword,
  credit,
  recentlyViewed,
  children,
  collectionTitle,
  basePath = "/discover",
  initialMode = "discover",
  initialLayout,
  saved,
  featured,
}: {
  initialData: TalentNavigatorInitialData;
  currentUserId: string;
  keyword: string;
  credit: string;
  recentlyViewed: Talent[];
  children: ReactNode;
  collectionTitle?: string;
  basePath?: string;
  initialMode?: DiscoverMode;
  /** List vs navigator inside Explore. `browse` initialMode implies list. */
  initialLayout?: ExploreLayout;
  /** Replaces the talent Saved tab; `null` hides it (industry keeps favorites in Roster). */
  saved?: ReactNode | null;
  /** Adds a Featured tab after Explore. */
  featured?: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState(() => resolveMode(initialMode));
  const [exploreLayout, setExploreLayout] = useState<ExploreLayout>(() =>
    resolveLayout(initialMode, initialLayout),
  );
  const [scrolled, setScrolled] = useState(false);
  const [selection, setSelected] = useState<Talent | null>(null);
  const [previewTracksGrid, setPreviewTracksGrid] = useState(false);
  const [viewed, setViewed] = useState(recentlyViewed);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [motionPaused, setMotionPaused] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(
    () =>
      buildTalentRows(initialData.talent, EMPTY_NAVIGATOR_FILTERS, {
        prefiltered: true,
        shuffleSalt: initialData.shuffleSalt,
      }),
    [initialData],
  );
  const mobile = useMobileDiscover();
  const slide = useNavigatorSlide(rows, mobile ? MOBILE_GRID_METRICS.stepX : NAVIGATOR_STEP_X, mobile ? MOBILE_GRID_METRICS.stepY : NAVIGATOR_STEP_Y);
  const focusCell = slide.focusCell;
  const restoredFocus = useRef<string | null>(null);
  const focusId = searchParams.get("focus");
  useEffect(() => {
    if (!focusId || restoredFocus.current === focusId) return;
    const rowIndex = rows.findIndex(row => row.talent.some(person => person.id === focusId));
    if (rowIndex < 0) return;
    const colIndex = rows[rowIndex].talent.findIndex(person => person.id === focusId);
    restoredFocus.current = focusId;
    focusCell(rowIndex, colIndex);
  }, [focusId, rows, focusCell]);
  const talentById = useMemo(() => {
    const map = new Map<string, Talent>();
    for (const person of initialData.talent) map.set(person.id, person);
    return map;
  }, [initialData.talent]);

  const panelOpen = selection !== null;
  const moveGrid = slide.navigate;
  const navigate = useCallback((direction: NavigatorDirection) => {
    if (panelOpen) setPreviewTracksGrid(true);
    moveGrid(direction);
  }, [moveGrid, panelOpen]);
  const showingList = mode === "discover" && exploreLayout === "list";
  const showingNavigator = mode === "discover" && exploreLayout === "navigator";
  const centeredTalent = rows[slide.activeRowIndex]?.talent[slide.activeColIndex];
  const selected = selection && previewTracksGrid && showingNavigator ? centeredTalent ?? selection : selection;
  useDiscoverIdle(canvasRef, showingNavigator && !mobile && !panelOpen && !motionPaused && rows.length > 1 && !keyword && !credit, navigate);

  useEffect(() => {
    if (!showingNavigator || !rows.length) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("#discover-profile-panel, input, textarea, select, [contenteditable='true'], [role='dialog'], [role='menu'], [role='listbox'], [role='search']")) return;
      if (event.key === "Enter" && !target?.closest("button, a")) {
        const person = rows[slide.activeRowIndex]?.talent[slide.activeColIndex];
        if (person && !event.repeat) {
          event.preventDefault();
          router.push(discoverDetailHref(basePath === "/talent" ? "/talent" : "/discover", "profile", person.slug || person.id, discoverReturnHref(basePath, searchParams.toString(), person.id)));
        }
        return;
      }
      const direction = (
        { ArrowLeft: "col-left", ArrowRight: "col-right", ArrowUp: "row-up", ArrowDown: "row-down" } as const
      )[event.key as "ArrowLeft"];
      if (!direction) return;
      event.preventDefault();
      navigate(direction);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showingNavigator, navigate, panelOpen, rows, slide.activeRowIndex, slide.activeColIndex, router, basePath, searchParams]);

  useEffect(() => {
    const node = resultsRef.current;
    if (!node) {
      setScrolled(false);
      return;
    }
    function onScroll() {
      setScrolled(node!.scrollTop > 8);
    }
    onScroll();
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [mode, exploreLayout]);

  function openTalent(talent: Talent) {
    const known = talentById.get(talent.id) ?? talent;
    const rowIndex = rows[slide.activeRowIndex]?.talent.some(person => person.id === known.id)
      ? slide.activeRowIndex
      : rows.findIndex(row => row.talent.some(person => person.id === known.id));
    const trackGrid = showingNavigator && rowIndex >= 0;
    if (trackGrid) focusCell(rowIndex, rows[rowIndex].talent.findIndex(person => person.id === known.id));
    setPreviewTracksGrid(trackGrid);
    setSelected(known);
    setViewed((current) => [known, ...current.filter((person) => person.id !== known.id)].slice(0, 10));
  }

  function pushMode(next: Exclude<DiscoverMode, "browse">, layout: ExploreLayout = "navigator") {
    setMode(next);
    if (next === "discover") setExploreLayout(layout);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "discover") {
      params.set("view", "explore");
      if (layout === "list") params.set("layout", "list");
      else params.delete("layout");
    } else {
      params.set("view", next);
      params.delete("layout");
    }
    router.push(`${basePath}?${params}`, { scroll: false });
  }

  function toggleExploreLayout() {
    const next = exploreLayout === "navigator" ? "list" : "navigator";
    pushMode("discover", next);
  }

  const filterLabel = credit
    ? `Worked with: ${credit}`
    : keyword
      ? `Search: ${keyword}`
      : null;
  const resultCount = initialData.talent.length;
  const emptyCopy = credit
    ? `No talent found who worked with ${credit}.`
    : "Try a different name, style, or location.";
  const shellClass = [
    "talent-discovery",
    `talent-discovery--${mode}`,
    showingList ? "talent-discovery--list" : "",
    scrolled ? "talent-discovery--scrolled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const profileBasePath = basePath === "/talent" ? "/talent" : "/discover";

  return (
    <DiscoverTalentProvider
      value={{
        openTalent,
        lookupTalent: (id) => talentById.get(id),
        selectedTalentId: selected?.id ?? null,
      }}
    >
      <div className={shellClass} ref={canvasRef}>
        <div className="talent-discovery-chrome" aria-hidden="true">
          <div className="talent-discovery-chrome__bar" />
        </div>
        <div className="talent-discovery-modes">
          {collectionTitle ? <p className="talent-collection-title">{collectionTitle}</p> : null}
          <SegmentedControl
            options={[
              { value: "discover" as const, label: "Explore" },
              ...(featured ? [{ value: "featured" as const, label: "Featured" }] : []),
              ...(saved === null ? [] : [{ value: "saved" as const, label: "Saved" }]),
            ]}
            value={mode}
            onChange={(next) => pushMode(next, next === "discover" ? "navigator" : exploreLayout)}
            ariaLabel="Discover view"
            activeTone="white"
          />
          {filterLabel && showingNavigator ? (
            <button
              type="button"
              className="talent-discovery-chip"
              aria-label={`Clear ${filterLabel}`}
              onClick={() => router.push(basePath)}
            >
              <span>{filterLabel}</span>
              <span>{resultCount === 1 ? "1 dancer" : `${resultCount} dancers`}</span>
              <span aria-hidden>×</span>
            </button>
          ) : null}
        </div>
        {mode === "discover" ? (
          <button
            type="button"
            className="talent-discovery-layout-toggle"
            aria-label={exploreLayout === "navigator" ? "Show list view" : "Show navigator view"}
            title={exploreLayout === "navigator" ? "List view" : "Navigator view"}
            onClick={toggleExploreLayout}
          >
            {exploreLayout === "navigator" ? <List size={18} aria-hidden /> : <LayoutGrid size={18} aria-hidden />}
          </button>
        ) : null}
        {mode === "featured" && featured ? (
          <div key="featured" ref={resultsRef} className="talent-discovery-results talent-discovery-featured ui-swap">
            {featured}
          </div>
        ) : mode === "saved" ? (
          <div key="saved" ref={resultsRef} className="talent-discovery-results ui-swap">
            {saved ?? <DiscoverSaved />}
          </div>
        ) : showingList ? (
          <div key="list" ref={resultsRef} className="talent-discovery-results ui-swap">{children}</div>
        ) : (
          <div className="talent-navigator ui-fade-in" aria-label="Discover">
            <div className="talent-navigator__stage">
              {rows.length ? (
                <div className="talent-navigator__grid-canvas">
                  <TalentNavigatorGrid
                    mobile={mobile}
                    rows={rows}
                    activeRowIndex={slide.activeRowIndex}
                    activeColByRowId={slide.activeColByRowId}
                    trackOffsetY={slide.trackOffsetY}
                    activeRowOffsetX={slide.activeRowOffsetX}
                    slideInstant={slide.slideInstant}
                    onSlideComplete={slide.handleSlideComplete}
                    onFocusCell={slide.focusCell}
                    onNavigate={navigate}
                    onOpenProfile={openTalent}
                    profileHref={(person) => discoverDetailHref(profileBasePath, "profile", person.slug || person.id, discoverReturnHref(basePath, searchParams.toString(), person.id))}
                    selectedTalentId={selected?.id ?? null}
                  />
                </div>
              ) : (
                <div className="talent-discovery-empty">
                  <ProductEmptyState
                    illustration="search"
                    title="No talent found"
                    description={emptyCopy}
                    actionLabel="Clear search"
                    onAction={() => router.push(basePath)}
                  />
                </div>
              )}
              <div className="talent-discovery-search-dock">
              <DiscoverSearchBar
                basePath={basePath}
                currentUserId={currentUserId}
                keyword={keyword}
                credit={credit}
                recentlyViewed={viewed}
                onOpenTalent={openTalent}
                onRecentlyViewedChange={setViewed}
              />
        {showingNavigator && !mobile && rows.length > 1 && !keyword && !credit ? <button type="button" className="talent-discovery-motion-toggle" aria-label={panelOpen ? "Idle motion paused while preview is open" : motionPaused ? "Resume idle motion" : "Pause idle motion"} aria-pressed={motionPaused || panelOpen} disabled={panelOpen} onClick={() => setMotionPaused(current => !current)}>
          {motionPaused || panelOpen ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
        </button> : null}
              </div>
            </div>
          </div>
        )}
      </div>
      <DiscoverProfilePanel
        talent={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
        profileBasePath={profileBasePath}
      />
    </DiscoverTalentProvider>
  );
}
