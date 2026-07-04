"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, PanelRight } from "lucide-react";

import {
  fetchNavigatorTalent,
  inviteTalentFromNavigator,
  listBuyerCastingTargets,
  saveTalentForBuyer,
  type CastingInviteTarget,
} from "@/app/(buyer-app)/talent/actions";
import type { NavigatorFilterOptions } from "@/lib/talent-navigator/filter-options";
import type { SavedSearchRow } from "@/lib/talent-buyers/saved-searches";
import { saveSearch } from "@/lib/talent-buyers/saved-searches";
import { getTalentProfileHref } from "@/lib/talent-navigator/profile-adapter";
import { buildTalentRows } from "@/lib/talent-navigator/rows";
import { useNavigatorSlide } from "@/lib/talent-navigator/use-navigator-slide";
import type { Talent, TalentNavigatorFilters, TalentNavigatorInitialData } from "@/lib/talent-navigator/types";
import { EMPTY_NAVIGATOR_FILTERS } from "@/lib/talent-navigator/types";
import { startConversationWith } from "@/lib/app/conversations";
import type { DashboardProfile } from "@/types/database";

import { ActiveTalentPanel } from "./ActiveTalentPanel";
import { AnimatedGridBackground } from "./AnimatedGridBackground";
import { useRegisterTalentChrome } from "@/components/talent-buyers/TalentChromeContext";
import { KeyboardShortcutsHint } from "./KeyboardShortcutsHint";
import { TalentFilterPanel } from "./TalentFilterPanel";
import { TalentNavigatorGrid, NAVIGATOR_STEP_X, NAVIGATOR_STEP_Y } from "./TalentNavigatorGrid";
import "./talent-navigator.css";

type TalentNavigatorPageProps = {
  initialData: TalentNavigatorInitialData;
  profile: DashboardProfile;
  filterOptions: NavigatorFilterOptions;
  initialFilters?: Partial<TalentNavigatorFilters>;
  initialSavedSearches?: SavedSearchRow[];
};

export function TalentNavigatorPage({
  initialData,
  filterOptions,
  initialFilters,
  initialSavedSearches,
}: TalentNavigatorPageProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<TalentNavigatorFilters>({
    ...EMPTY_NAVIGATOR_FILTERS,
    ...initialFilters,
  });
  const [talentPool, setTalentPool] = useState(initialData.talent);
  const [isSearching, setIsSearching] = useState(false);
  const skipInitialFetchRef = useRef(true);
  const searchRequestRef = useRef(0);
  const [savedSearches, setSavedSearches] = useState<SavedSearchRow[]>(initialSavedSearches ?? []);
  const [savedSearchId, setSavedSearchId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const rows = useMemo(
    () => buildTalentRows(talentPool, filters, { prefiltered: true }),
    [talentPool, filters],
  );
  const resultCount = talentPool.length;

  const {
    activeRowIndex: clampedRowIndex,
    activeColByRowId,
    trackOffsetY,
    activeRowOffsetX,
    slideInstant,
    navigate,
    handleSlideComplete,
    focusCell,
    resetNavigation,
  } = useNavigatorSlide(rows, NAVIGATOR_STEP_X, NAVIGATOR_STEP_Y);

  const currentRow = rows[clampedRowIndex];
  const clampedColIndex = currentRow?.talent.length
    ? Math.min(activeColByRowId[currentRow.id] ?? 0, currentRow.talent.length - 1)
    : 0;
  const activeTalent: Talent | null = currentRow?.talent[clampedColIndex] ?? null;

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    const handle = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await fetchNavigatorTalent(filters);
        if (searchRequestRef.current !== requestId) return;
        setTalentPool(data.talent);
        resetNavigation();
      } catch {
        if (searchRequestRef.current !== requestId) return;
        showToast("Could not refresh talent results");
      } finally {
        if (searchRequestRef.current === requestId) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => window.clearTimeout(handle);
  }, [filters, resetNavigation, showToast]);

  const openProfile = useCallback(
    (talent: Talent) => {
      router.push(getTalentProfileHref(talent));
    },
    [router],
  );

  const saveTalent = useCallback(
    (talent: Talent) => {
      void saveTalentForBuyer(talent.id || talent.slug).then((result) => {
        showToast(result.ok ? `${talent.name} saved to roster` : result.error ?? "Could not save talent");
      });
    },
    [showToast],
  );

  const [invitePicker, setInvitePicker] = useState<{
    talent: Talent;
    targets: CastingInviteTarget[];
    loading: boolean;
  } | null>(null);

  const openInvitePicker = useCallback(
    (talent: Talent) => {
      setInvitePicker({ talent, targets: [], loading: true });
      void listBuyerCastingTargets().then((result) => {
        if (result.error) {
          setInvitePicker(null);
          showToast(result.error);
          return;
        }
        if (!result.targets.length) {
          setInvitePicker(null);
          showToast("Create a project or casting first to send invites.");
          return;
        }
        setInvitePicker((current) =>
          current?.talent.id === talent.id ? { ...current, targets: result.targets, loading: false } : current,
        );
      });
    },
    [showToast],
  );

  const sendInvite = useCallback(
    (talent: Talent, target: CastingInviteTarget) => {
      setInvitePicker(null);
      void inviteTalentFromNavigator(talent.id || talent.slug, {
        projectId: target.projectId,
        castingId: target.castingId,
      }).then((result) => {
        showToast(result.ok ? `Invite sent to ${talent.name}` : result.error ?? "Could not send invite");
      });
    },
    [showToast],
  );

  const contactTalent = useCallback(
    (talent: Talent) => {
      void startConversationWith({ targetUserId: talent.id }).then((result) => {
        if (result.conversationId) {
          router.push("/messages");
          return;
        }
        if (result.pendingRequest) {
          showToast(`Message request sent to ${talent.name}`);
          return;
        }
        showToast(result.error ?? "Could not start a conversation");
      });
    },
    [router, showToast],
  );

  const handleSaveSearch = useCallback(() => {
    const label = window.prompt("Name this search");
    const trimmed = label?.trim();
    if (!trimmed) return;

    void saveSearch(trimmed, filters).then((result) => {
      if (result.ok && result.id) {
        const id = result.id;
        setSavedSearches((current) => [
          { id, label: trimmed, filters: { ...filters }, createdAt: new Date().toISOString() },
          ...current,
        ]);
        setSavedSearchId(id);
        showToast("Search saved");
      } else {
        showToast(result.error ?? "Could not save search");
      }
    });
  }, [filters, showToast]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.key === "Escape") {
        if (filtersOpen) {
          setFiltersOpen(false);
          event.preventDefault();
          return;
        }
        if (detailsPanelOpen) {
          setDetailsPanelOpen(false);
          event.preventDefault();
          return;
        }
        return;
      }

      if (isTyping || rows.length === 0) return;

      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          navigate("col-right");
          break;
        case "ArrowLeft":
          event.preventDefault();
          navigate("col-left");
          break;
        case "ArrowDown":
          event.preventDefault();
          navigate("row-down");
          break;
        case "ArrowUp":
          event.preventDefault();
          navigate("row-up");
          break;
        case "Enter":
          if (activeTalent) {
            event.preventDefault();
            openProfile(activeTalent);
          }
          break;
        case "s":
        case "S":
          if (activeTalent) {
            event.preventDefault();
            saveTalent(activeTalent);
          }
          break;
        case "i":
        case "I":
          if (activeTalent) {
            event.preventDefault();
            openInvitePicker(activeTalent);
          }
          break;
        case "c":
        case "C":
          if (activeTalent) {
            event.preventDefault();
            contactTalent(activeTalent);
          }
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTalent,
    contactTalent,
    detailsPanelOpen,
    filtersOpen,
    navigate,
    openInvitePicker,
    openProfile,
    rows.length,
    saveTalent,
    showToast,
  ]);

  function updateFilters(partial: Partial<TalentNavigatorFilters>) {
    setSavedSearchId("");
    setFilters((current) => ({ ...current, ...partial }));
    resetNavigation();
  }

  function applySavedSearch(id: string) {
    setSavedSearchId(id);

    if (!id) {
      setFilters({ ...EMPTY_NAVIGATOR_FILTERS, ...initialFilters });
      resetNavigation();
      return;
    }

    const saved = savedSearches.find((search) => search.id === id);
    if (!saved) return;

    setFilters({ ...EMPTY_NAVIGATOR_FILTERS, ...saved.filters });
    resetNavigation();
  }

  function clearFilters() {
    setSavedSearchId("");
    setFilters({ ...EMPTY_NAVIGATOR_FILTERS, ...initialFilters });
    resetNavigation();
  }

  const talentChromeStart = useMemo(
    () => (
      <button
        type="button"
        className={`talent-navigator__chrome-pill${filtersOpen ? " talent-navigator__chrome-pill--active" : ""}`}
        onClick={() => setFiltersOpen((open) => !open)}
        aria-pressed={filtersOpen}
        aria-label={filtersOpen ? "Hide filters" : "Show filters"}
      >
        <Filter className="size-3.5" aria-hidden />
        Filters
      </button>
    ),
    [filtersOpen],
  );

  const talentChromeEnd = useMemo(
    () => (
      <button
        type="button"
        className={`talent-navigator__chrome-pill${detailsPanelOpen ? " talent-navigator__chrome-pill--active" : ""}`}
        onClick={() => setDetailsPanelOpen((open) => !open)}
        aria-pressed={detailsPanelOpen}
        aria-label={detailsPanelOpen ? "Hide details" : "Show details"}
      >
        <PanelRight className="size-3.5" aria-hidden />
        Details
      </button>
    ),
    [detailsPanelOpen],
  );

  useRegisterTalentChrome({ start: talentChromeStart, end: talentChromeEnd });

  return (
    <div
      ref={rootRef}
      className="talent-navigator"
      tabIndex={-1}
    >
      {filtersOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Close filter overlay"
          onClick={() => setFiltersOpen(false)}
        />
      ) : null}

      {detailsPanelOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Close details overlay"
          onClick={() => setDetailsPanelOpen(false)}
        />
      ) : null}

      <div className="talent-navigator__stage">
        {rows.length > 0 ? (
          <div className="talent-navigator__grid-canvas" aria-hidden={false}>
            <AnimatedGridBackground />
            <TalentNavigatorGrid
              rows={rows}
              activeRowIndex={clampedRowIndex}
              activeColByRowId={activeColByRowId}
              trackOffsetY={trackOffsetY}
              activeRowOffsetX={activeRowOffsetX}
              slideInstant={slideInstant}
              onSlideComplete={handleSlideComplete}
              onFocusCell={focusCell}
              onOpenProfile={openProfile}
              onNavigate={navigate}
            />
          </div>
        ) : null}

        <div className="talent-navigator__overlay-layout">
          <TalentFilterPanel
            filters={filters}
            filterOptions={filterOptions}
            savedSearches={savedSearches}
            savedSearchId={savedSearchId}
            onChange={updateFilters}
            onSavedSearchChange={applySavedSearch}
            onClear={clearFilters}
            onSaveSearch={handleSaveSearch}
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
          />

          {rows.length === 0 ? (
            <section className="talent-navigator__hud" aria-label="Talent navigator">
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-lg font-semibold text-white">No matches</p>
                <p className="max-w-md text-sm text-white/45">
                  Try broadening location or removing a filter to rebuild category rows.
                </p>
                <button
                  type="button"
                  className="talent-navigator__action-btn"
                  onClick={clearFilters}
                >
                  Clear All Filters
                </button>
              </div>
            </section>
          ) : null}

          <ActiveTalentPanel
            talent={activeTalent}
            open={detailsPanelOpen}
            onClose={() => setDetailsPanelOpen(false)}
            onSave={() => activeTalent && saveTalent(activeTalent)}
            onInvite={() => activeTalent && openInvitePicker(activeTalent)}
            onContact={() => activeTalent && contactTalent(activeTalent)}
            onAddToProject={() => activeTalent && showToast(`${activeTalent.name} added to project`)}
          />
        </div>
      </div>

      {initialData.usingFallbackData ? (
        <p className="talent-navigator__fallback-banner" role="status">
          Showing sample profiles until live search is connected.
        </p>
      ) : null}

      <footer className="talent-navigator__footer talent-navigator__chrome-bar">
        <div className="talent-navigator__chrome-start">
          <span className="talent-navigator__chrome-attribution">Powered by Motiion</span>
        </div>

        <p className="talent-navigator__chrome-category">
          {currentRow?.label ?? (rows.length ? "Browse talent" : "No results")}
        </p>

        <div className="talent-navigator__chrome-actions">
          <span className="talent-navigator__chrome-meta">
            {isSearching ? "Searching…" : `${resultCount.toLocaleString()} results`}
          </span>
          <KeyboardShortcutsHint className="hidden xl:inline" />
          {activeTalent ? (
            <div className="flex gap-2 lg:hidden">
              <button
                type="button"
                className="talent-navigator__action-btn talent-navigator__action-btn--primary"
                onClick={() => openProfile(activeTalent)}
              >
                View Profile
              </button>
            </div>
          ) : null}
        </div>
      </footer>

      {detailsPanelOpen && activeTalent ? (
        <div className="talent-navigator__overlay talent-navigator__overlay--detail lg:hidden">
          <div className="talent-navigator__sheet">
            <ActiveTalentPanel
              talent={activeTalent}
              compact
              variant="sheet"
              onClose={() => setDetailsPanelOpen(false)}
              onSave={() => saveTalent(activeTalent)}
              onInvite={() => openInvitePicker(activeTalent)}
              onContact={() => contactTalent(activeTalent)}
              onAddToProject={() => showToast(`${activeTalent.name} added to project`)}
            />
          </div>
        </div>
      ) : null}

      {invitePicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close invite picker"
            onClick={() => setInvitePicker(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#101014] p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Invite ${invitePicker.talent.name}`}
          >
            <h2 className="text-base font-semibold text-white">
              Invite {invitePicker.talent.name}
            </h2>
            <p className="mt-1 text-sm text-white/55">Choose a casting or project.</p>
            {invitePicker.loading ? (
              <p className="mt-4 text-sm text-white/45">Loading your castings…</p>
            ) : (
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                {invitePicker.targets.map((target) => (
                  <li key={`${target.projectId}-${target.castingId ?? "project"}`}>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-white/10 bg-white/4 px-4 py-3 text-left text-sm font-medium text-white/85 transition hover:border-white/25 hover:bg-white/8"
                      onClick={() => sendInvite(invitePicker.talent, target)}
                    >
                      {target.title}
                      {target.castingId ? null : (
                        <span className="ml-2 text-xs font-normal text-white/45">project invite</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-white/12 px-4 py-2 text-sm text-white/60 hover:bg-white/6"
              onClick={() => setInvitePicker(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="talent-navigator__toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
