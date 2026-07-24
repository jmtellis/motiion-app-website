"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addTalentToProjectRoster,
  fetchNavigatorTalent,
  inviteTalentFromNavigator,
  listBuyerCastingTargets,
  listBuyerOpenRoles,
  saveTalentToRoster,
  type CastingInviteTarget,
} from "@/app/(buyer-app)/(paid)/talent/actions";
import type { BuyerOpenRole } from "@/lib/talent-navigator/open-roles";
import type { NavigatorFilterOptions } from "@/lib/talent-navigator/filter-options";
import type { SavedSearchRow } from "@/lib/talent-buyers/saved-searches";
import { deleteSavedSearch, saveSearch } from "@/lib/talent-buyers/saved-searches";
import { getTalentProfileHref } from "@/lib/talent-navigator/profile-adapter";
import { buildTalentRows } from "@/lib/talent-navigator/rows";
import { useNavigatorSlide } from "@/lib/talent-navigator/use-navigator-slide";
import type { Talent, TalentNavigatorFilters, TalentNavigatorInitialData } from "@/lib/talent-navigator/types";
import { EMPTY_NAVIGATOR_FILTERS } from "@/lib/talent-navigator/types";
import { startConversationWith } from "@/lib/app/conversations";
import type { DashboardProfile } from "@/types/database";

import { ActiveTalentPanel } from "./ActiveTalentPanel";
import { AnimatedGridBackground } from "./AnimatedGridBackground";
import {
  mapOpenRoleToNavigatorFilters,
} from "@/lib/talent-navigator/open-roles";
import { SegmentedControl } from "@/components/talent-buyers/dashboard/SegmentedControl";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { TalentNlChatPanel } from "./TalentNlChatPanel";
import { TalentNavigatorGrid, NAVIGATOR_STEP_X, NAVIGATOR_STEP_Y } from "./TalentNavigatorGrid";
import "./talent-navigator.css";

type NavigatorViewMode = "chat" | "browse";

const NAVIGATOR_VIEW_OPTIONS: Array<{ value: NavigatorViewMode; label: string }> = [
  { value: "chat", label: "Discover" },
  { value: "browse", label: "Browse" },
];

type TalentNavigatorPageProps = {
  initialData: TalentNavigatorInitialData;
  profile: DashboardProfile;
  filterOptions: NavigatorFilterOptions;
  initialFilters?: Partial<TalentNavigatorFilters>;
  initialSavedSearches?: SavedSearchRow[];
  initialOpenRoleId?: string;
};

export function TalentNavigatorPage({
  initialData,
  filterOptions,
  initialFilters,
  initialSavedSearches,
  initialOpenRoleId = "",
}: TalentNavigatorPageProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<TalentNavigatorFilters>({
    ...EMPTY_NAVIGATOR_FILTERS,
    ...initialFilters,
  });
  const [talentPool, setTalentPool] = useState(initialData.talent);
  // Keep the server-provided salt for the whole visit so SSR/hydration match and filters don't reshuffle.
  const [shuffleSalt] = useState(() => initialData.shuffleSalt ?? "");
  const skipInitialFetchRef = useRef(true);
  const searchRequestRef = useRef(0);
  const [savedSearches, setSavedSearches] = useState<SavedSearchRow[]>(initialSavedSearches ?? []);
  const [savedSearchId, setSavedSearchId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<NavigatorViewMode>("chat");
  const [openRoles, setOpenRoles] = useState<BuyerOpenRole[]>([]);
  const [selectedOpenRoleId, setSelectedOpenRoleId] = useState(initialOpenRoleId);
  const appliedInitialOpenRoleRef = useRef(false);
  const { showToast } = useToast();

  const rows = useMemo(
    () => buildTalentRows(talentPool, filters, { prefiltered: true, shuffleSalt }),
    [talentPool, filters, shuffleSalt],
  );

  useEffect(() => {
    void listBuyerOpenRoles().then((result) => {
      if (result.error) {
        showToast(result.error);
        return;
      }
      setOpenRoles(result.roles);
    });
  }, [showToast]);

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

  const applyOpenRole = useCallback(
    (roleId: string, roleList: BuyerOpenRole[] = openRoles) => {
      setSelectedOpenRoleId(roleId);
      setSavedSearchId("");

      if (!roleId) {
        setFilters({ ...EMPTY_NAVIGATOR_FILTERS, ...initialFilters });
        resetNavigation();
        return;
      }

      const role = roleList.find((item) => item.id === roleId);
      if (!role) return;

      setFilters(mapOpenRoleToNavigatorFilters(role));
      resetNavigation();
    },
    [openRoles, resetNavigation],
  );

  useEffect(() => {
    if (appliedInitialOpenRoleRef.current || !initialOpenRoleId || !openRoles.length) return;
    const role = openRoles.find((item) => item.id === initialOpenRoleId);
    if (!role) return;
    appliedInitialOpenRoleRef.current = true;
    applyOpenRole(initialOpenRoleId, openRoles);
  }, [applyOpenRole, initialOpenRoleId, openRoles]);

  const currentRow = rows[clampedRowIndex];
  const clampedColIndex = currentRow?.talent.length
    ? Math.min(activeColByRowId[currentRow.id] ?? 0, currentRow.talent.length - 1)
    : 0;
  const activeTalent: Talent | null = currentRow?.talent[clampedColIndex] ?? null;

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    const handle = window.setTimeout(async () => {
      try {
        const data = await fetchNavigatorTalent(filters);
        if (searchRequestRef.current !== requestId) return;
        setTalentPool(data.talent);
        resetNavigation();
      } catch {
        if (searchRequestRef.current !== requestId) return;
        showToast("Could not refresh talent results");
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

  const openCover = useCallback(() => {
    setFiltersOpen(false);
    setViewMode("browse");
  }, []);

  const handleOpenFromGrid = useCallback(
    (talent: Talent) => {
      if (viewMode === "chat") {
        openCover();
        return;
      }
      openProfile(talent);
    },
    [openCover, openProfile, viewMode],
  );

  const [savePickerOpen, setSavePickerOpen] = useState(false);

  useEffect(() => {
    setSavePickerOpen(false);
  }, [activeTalent?.id]);

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
      void startConversationWith({ targetUserId: talent.id, initialMessage: "Hi!" }).then((result) => {
        if (result.conversationId) {
          router.push(`/messages?conversation=${result.conversationId}`);
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

  const [projectPicker, setProjectPicker] = useState<{
    talent: Talent;
    targets: CastingInviteTarget[];
    loading: boolean;
  } | null>(null);

  const openProjectPicker = useCallback(
    (talent: Talent) => {
      setProjectPicker({ talent, targets: [], loading: true });
      void listBuyerCastingTargets().then((result) => {
        if (result.error) {
          setProjectPicker(null);
          showToast(result.error);
          return;
        }
        if (!result.targets.length) {
          setProjectPicker(null);
          showToast("Create a project first.");
          return;
        }
        setProjectPicker((current) =>
          current?.talent.id === talent.id ? { ...current, targets: result.targets, loading: false } : current,
        );
      });
    },
    [showToast],
  );

  const addTalentToProject = useCallback(
    (talent: Talent, target: CastingInviteTarget) => {
      setProjectPicker(null);
      void addTalentToProjectRoster({
        projectId: target.projectId,
        talentIdOrSlug: talent.id || talent.slug,
      }).then((result) => {
        showToast(
          result.ok ? `${talent.name} added to project roster` : result.error ?? "Could not add to project",
        );
      });
    },
    [showToast],
  );

  const applyNlFilters = useCallback(
    (nextFilters: TalentNavigatorFilters, resetNav: boolean) => {
      setSavedSearchId("");
      setFilters(nextFilters);
      if (resetNav) resetNavigation();
    },
    [resetNavigation],
  );

  const applyNlTalentPool = useCallback((talent: Talent[]) => {
    setTalentPool(talent);
  }, []);

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

  const handleDeleteSavedSearch = useCallback(() => {
    if (!savedSearchId) return;
    const selected = savedSearches.find((search) => search.id === savedSearchId);
    const confirmed = window.confirm(
      selected
        ? `Delete saved search “${selected.label}”?`
        : "Delete this saved search?",
    );
    if (!confirmed) return;

    const id = savedSearchId;
    void deleteSavedSearch(id).then((result) => {
      if (!result.ok) {
        showToast(result.error ?? "Could not delete search");
        return;
      }

      setSavedSearches((current) => current.filter((search) => search.id !== id));
      setSavedSearchId("");
      setSelectedOpenRoleId("");
      setFilters({ ...EMPTY_NAVIGATOR_FILTERS, ...initialFilters });
      resetNavigation();
      showToast("Saved search deleted");
    });
  }, [initialFilters, resetNavigation, savedSearchId, savedSearches, showToast]);

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
            if (viewMode === "chat") {
              openCover();
            } else {
              openProfile(activeTalent);
            }
          }
          break;
        case "s":
        case "S":
          if (activeTalent) {
            event.preventDefault();
            setViewMode("browse");
            setSavePickerOpen(true);
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
    filtersOpen,
    navigate,
    openInvitePicker,
    openCover,
    openProfile,
    rows.length,
    showToast,
    viewMode,
  ]);

  function updateFilters(partial: Partial<TalentNavigatorFilters>) {
    setSavedSearchId("");
    setSelectedOpenRoleId("");
    setFilters((current) => {
      const next: TalentNavigatorFilters = {
        ...current,
        ...partial,
        openRoleId: "",
        genres: partial.genres ?? current.genres ?? [],
        skills: partial.skills ?? current.skills ?? [],
        ethnicities: partial.ethnicities ?? current.ethnicities ?? [],
        hairColors: partial.hairColors ?? current.hairColors ?? [],
        eyeColors: partial.eyeColors ?? current.eyeColors ?? [],
        artists: partial.artists ?? current.artists ?? [],
        choreographers: partial.choreographers ?? current.choreographers ?? [],
        productions: partial.productions ?? current.productions ?? [],
        verificationStatuses: partial.verificationStatuses ?? current.verificationStatuses ?? [],
      };
      if (partial.genres) next.style = partial.genres[0] ?? "";
      if (partial.ethnicities) next.ethnicity = partial.ethnicities[0] ?? "";
      return next;
    });
    resetNavigation();
  }

  function applySavedSearch(id: string) {
    setSavedSearchId(id);

    if (!id) {
      setSelectedOpenRoleId("");
      setFilters({ ...EMPTY_NAVIGATOR_FILTERS, ...initialFilters });
      resetNavigation();
      return;
    }

    const saved = savedSearches.find((search) => search.id === id);
    if (!saved) return;

    setSelectedOpenRoleId(saved.filters.openRoleId ?? "");
    setFilters({ ...EMPTY_NAVIGATOR_FILTERS, ...saved.filters });
    resetNavigation();
  }

  function clearFilters() {
    setSavedSearchId("");
    setSelectedOpenRoleId("");
    setFilters({ ...EMPTY_NAVIGATOR_FILTERS, ...initialFilters });
    resetNavigation();
  }

  const browseCategoryLabel = currentRow?.label ?? (rows.length ? "Browse" : undefined);

  return (
    <div
      ref={rootRef}
      className={`talent-navigator talent-navigator--${viewMode}${
        viewMode === "browse" ? " talent-navigator--focus-lifted" : ""
      }`}
      tabIndex={-1}
    >
      <div
        className={`talent-navigator__stage${filtersOpen ? " talent-navigator__stage--filters-open" : ""}`}
      >
        <div className="talent-navigator__stage-toolbar">
          <div className="talent-navigator__stage-toolbar-side" />

          <div className="talent-navigator__stage-toolbar-center">
            {filtersOpen ? (
              <div className="talent-navigator__filter-mode-label" role="status" aria-live="polite">
                Filter
              </div>
            ) : (
              <SegmentedControl
                options={NAVIGATOR_VIEW_OPTIONS}
                value={viewMode}
                onChange={setViewMode}
                ariaLabel="Find talent view"
                equalWidth
                activeTone="white"
              />
            )}
          </div>

          <div className="talent-navigator__stage-toolbar-side talent-navigator__stage-toolbar-side--end" />
        </div>

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
              onOpenProfile={handleOpenFromGrid}
              onNavigate={navigate}
            />
          </div>
        ) : null}

        <div className="talent-navigator__overlay-layout">
          {rows.length === 0 && !filtersOpen ? (
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
        </div>

        {viewMode === "browse" && !filtersOpen && rows.length > 0 ? (
          <>
            <button
              type="button"
              className="talent-navigator__browse-edge-nav talent-navigator__browse-edge-nav--left"
              onClick={() => navigate("col-left")}
              aria-label="Previous talent"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              className="talent-navigator__browse-edge-nav talent-navigator__browse-edge-nav--right"
              onClick={() => navigate("col-right")}
              aria-label="Next talent"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </>
        ) : null}

        {viewMode === "browse" || filtersOpen ? (
          <ActiveTalentPanel
            variant="focus-card"
            talent={activeTalent}
            open
            saveOpen={savePickerOpen}
            onSaveOpenChange={setSavePickerOpen}
            onInvite={() => activeTalent && openInvitePicker(activeTalent)}
            onContact={() => activeTalent && contactTalent(activeTalent)}
            onAddToProject={() => activeTalent && openProjectPicker(activeTalent)}
            categoryLabel={browseCategoryLabel}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((open) => !open)}
            filters={filters}
            filterOptions={filterOptions}
            savedSearches={savedSearches}
            savedSearchId={savedSearchId}
            onFiltersChange={updateFilters}
            onSavedSearchChange={applySavedSearch}
            onClearFilters={clearFilters}
            onSaveSearch={handleSaveSearch}
            onDeleteSavedSearch={handleDeleteSavedSearch}
            onApplyFilters={() => setFiltersOpen(false)}
          />
        ) : (
          <TalentNlChatPanel
            filters={filters}
            filtersOpen={filtersOpen}
            onToggleFilters={() => setFiltersOpen((open) => !open)}
            openRoles={openRoles}
            selectedOpenRoleId={selectedOpenRoleId}
            onOpenRoleChange={applyOpenRole}
            onFiltersChange={applyNlFilters}
            onTalentPoolChange={applyNlTalentPool}
            categoryLabel={currentRow?.label ?? (rows.length ? "Browse" : undefined)}
            open
          />
        )}
      </div>

      {initialData.usingFallbackData ? (
        <p className="talent-navigator__fallback-banner" role="status">
          Showing sample profiles until live search is connected.
        </p>
      ) : null}

      {projectPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close project picker"
            onClick={() => setProjectPicker(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#151515] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Add to project roster</h3>
            <p className="mt-1 text-sm text-white/50">{projectPicker.talent.name}</p>
            {projectPicker.loading ? (
              <p className="mt-4 text-sm text-white/45">Loading projects…</p>
            ) : (
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                {projectPicker.targets.map((target) => (
                  <li key={`${target.projectId}-${target.castingId ?? "project"}`}>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-white hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)]"
                      onClick={() => addTalentToProject(projectPicker.talent, target)}
                    >
                      {target.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
    </div>
  );
}
