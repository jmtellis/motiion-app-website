"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DiscoverProfilePanel } from "@/components/app/DiscoverProfilePanel";
import { DiscoverSaved } from "@/components/app/DiscoverSaved";
import { DiscoverSearchBar } from "@/components/app/DiscoverSearchBar";
import { DiscoverTalentProvider } from "@/components/app/discover-selection";
import {
  TalentNavigatorGrid,
  NAVIGATOR_STEP_X,
  NAVIGATOR_STEP_Y,
} from "@/components/talent-buyers/talent-navigator/TalentNavigatorGrid";
import { SegmentedControl } from "@/components/talent-buyers/dashboard/SegmentedControl";
import { buildTalentRows } from "@/lib/talent-navigator/rows";
import { useNavigatorSlide } from "@/lib/talent-navigator/use-navigator-slide";
import {
  EMPTY_NAVIGATOR_FILTERS,
  type Talent,
  type TalentNavigatorInitialData,
} from "@/lib/talent-navigator/types";
import "@/components/talent-buyers/talent-navigator/talent-navigator.css";
import { ProductEmptyState } from "@/components/ui/EmptyState";

export type DiscoverMode = "featured" | "discover" | "browse" | "saved";

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
  initialMode = "browse",
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
  /** Replaces the talent Saved tab; `null` hides it (industry keeps favorites in Roster). */
  saved?: ReactNode | null;
  /** Adds a leading Featured tab. */
  featured?: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<DiscoverMode>(initialMode);
  const [selected, setSelected] = useState<Talent | null>(null);
  const [viewed, setViewed] = useState(recentlyViewed);
  const rows = useMemo(
    () =>
      buildTalentRows(initialData.talent, EMPTY_NAVIGATOR_FILTERS, {
        prefiltered: true,
        shuffleSalt: initialData.shuffleSalt,
      }),
    [initialData],
  );
  const slide = useNavigatorSlide(rows, NAVIGATOR_STEP_X, NAVIGATOR_STEP_Y);
  const talentById = useMemo(() => {
    const map = new Map<string, Talent>();
    for (const person of initialData.talent) map.set(person.id, person);
    return map;
  }, [initialData.talent]);

  const navigate = slide.navigate;
  const panelOpen = selected !== null;
  useEffect(() => {
    if (mode !== "discover" || panelOpen || !rows.length) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [role='menu'], [role='listbox']")) return;
      const direction = (
        { ArrowLeft: "col-left", ArrowRight: "col-right", ArrowUp: "row-up", ArrowDown: "row-down" } as const
      )[event.key as "ArrowLeft"];
      if (!direction) return;
      event.preventDefault();
      navigate(direction);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, navigate, panelOpen, rows.length]);

  function openTalent(talent: Talent) {
    const known = talentById.get(talent.id) ?? talent;
    setSelected(known);
    setViewed((current) => [known, ...current.filter((person) => person.id !== known.id)].slice(0, 10));
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

  return (
    <DiscoverTalentProvider value={{ openTalent, lookupTalent: (id) => talentById.get(id) }}>
      <div className={`talent-discovery talent-discovery--${mode}`}>
        <div className="talent-discovery-modes">
          {collectionTitle ? <p className="talent-collection-title">{collectionTitle}</p> : null}
          <SegmentedControl
            options={[
              ...(featured ? [{ value: "featured" as const, label: "Featured" }] : []),
              { value: "browse" as const, label: "Browse" },
              { value: "discover" as const, label: "Explore" },
              ...(saved === null ? [] : [{ value: "saved" as const, label: "Saved" }]),
            ]}
            value={mode}
            onChange={(next) => {
              setMode(next);
              const params = new URLSearchParams(searchParams.toString());
              params.set("view", next === "discover" ? "explore" : next);
              router.push(`${basePath}?${params}`, { scroll: false });
            }}
            ariaLabel="Discover view"
            activeTone="white"
          />
          {filterLabel && mode === "discover" ? (
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
        {mode === "featured" && featured ? (
          <div key="featured" className="talent-discovery-results talent-discovery-featured ui-swap">
            {featured}
          </div>
        ) : mode === "saved" ? (
          <div key="saved" className="talent-discovery-results ui-swap">
            {saved ?? <DiscoverSaved />}
          </div>
        ) : mode === "browse" ? (
          <div key="browse" className="talent-discovery-results ui-swap">{children}</div>
        ) : (
          <div
            className="talent-navigator ui-fade-in"
            aria-label="Discover"
          >
            <div className="talent-navigator__stage">
              {rows.length ? (
                <div className="talent-navigator__grid-canvas">
                  <TalentNavigatorGrid
                    rows={rows}
                    activeRowIndex={slide.activeRowIndex}
                    activeColByRowId={slide.activeColByRowId}
                    trackOffsetY={slide.trackOffsetY}
                    activeRowOffsetX={slide.activeRowOffsetX}
                    slideInstant={slide.slideInstant}
                    onSlideComplete={slide.handleSlideComplete}
                    onFocusCell={slide.focusCell}
                    onNavigate={slide.navigate}
                    onOpenProfile={openTalent}
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
              <DiscoverSearchBar
                basePath={basePath}
                currentUserId={currentUserId}
                keyword={keyword}
                credit={credit}
                recentlyViewed={viewed}
                onOpenTalent={openTalent}
                onRecentlyViewedChange={setViewed}
              />
            </div>
          </div>
        )}
      </div>
      <DiscoverProfilePanel
        key={selected?.id ?? "none"}
        talent={selected}
        open={selected !== null}
        onClose={() => setSelected(null)}
      />
    </DiscoverTalentProvider>
  );
}
