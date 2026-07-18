"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelRight } from "lucide-react";

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
import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import {
  mapOpenRoleToNavigatorFilters,
} from "@/lib/talent-navigator/open-roles";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { TalentFilterPanel } from "./TalentFilterPanel";
import { TalentNlChatPanel } from "./TalentNlChatPanel";
import { TalentNavigatorGrid, NAVIGATOR_STEP_X, NAVIGATOR_STEP_Y } from "./TalentNavigatorGrid";
import "./talent-navigator.css";

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
  const skipInitialFetchRef = useRef(true);
  const searchRequestRef = useRef(0);
  const [savedSearches, setSavedSearches] = useState<SavedSearchRow[]>(initialSavedSearches ?? []);
  const [savedSearchId, setSavedSearchId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [openRoles, setOpenRoles] = useState<BuyerOpenRole[]>([]);
  const [selectedOpenRoleId, setSelectedOpenRoleId] = useState(initialOpenRoleId);
  const appliedInitialOpenRoleRef = useRef(false);
  const { showToast } = useToast();

  const rows = useMemo(
    () => buildTalentRows(talentPool, filters, { prefiltered: true }),
    [talentPool, filters],
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
      setTalentPool([]);
      void fetchNavigatorTalent(nextFilters).then((data) => {
        setTalentPool(data.talent);
      });
    },
    [resetNavigation],
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
            setDetailsPanelOpen(true);
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
    detailsPanelOpen,
    filtersOpen,
    navigate,
    openInvitePicker,
    openProfile,
    rows.length,
    showToast,
  ]);

  function updateFilters(partial: Partial<TalentNavigatorFilters>) {
    setSavedSearchId("");
    setSelectedOpenRoleId("");
    setFilters((current) => ({ ...current, ...partial, openRoleId: "" }));
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

  const talentBreadcrumbs = useMemo(() => [{ label: "Talent" }], []);

  const talentChromeEnd = useMemo(
    () => (
      <button
        type="button"
        className={`talent-navigator__header-icon-btn${detailsPanelOpen ? " talent-navigator__header-icon-btn--active" : ""}`}
        onClick={() => setDetailsPanelOpen((open) => !open)}
        aria-pressed={detailsPanelOpen}
        aria-label={detailsPanelOpen ? "Collapse talent details" : "Expand talent details"}
      >
        <PanelRight className="size-4" aria-hidden />
      </button>
    ),
    [detailsPanelOpen],
  );

  useRegisterBuyerChrome({
    breadcrumbs: talentBreadcrumbs,
    end: talentChromeEnd,
    revision: `${filtersOpen ? "filters-open" : "filters-closed"}:${detailsPanelOpen ? "details-open" : "details-closed"}`,
  });

  return (
    <div
      ref={rootRef}
      className="talent-navigator"
      tabIndex={-1}
    >
      {detailsPanelOpen ? (
        <button
          type="button"
          className="talent-navigator__detail-scrim lg:hidden"
          aria-label="Close details panel"
          onClick={() => setDetailsPanelOpen(false)}
        />
      ) : null}

      <div
        className={`talent-navigator__stage${filtersOpen ? " talent-navigator__stage--filters-open" : ""}`}
      >
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
              categoryLabel={currentRow?.label ?? (rows.length ? "Browse talent" : undefined)}
              onSlideComplete={handleSlideComplete}
              onFocusCell={focusCell}
              onOpenProfile={openProfile}
              onNavigate={navigate}
            />
          </div>
        ) : null}

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
        />

        <div className="talent-navigator__overlay-layout">
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
        </div>

        <ActiveTalentPanel
          talent={activeTalent}
          open={detailsPanelOpen}
          saveOpen={savePickerOpen}
          onSaveOpenChange={setSavePickerOpen}
          onInvite={() => activeTalent && openInvitePicker(activeTalent)}
          onContact={() => activeTalent && contactTalent(activeTalent)}
          onAddToProject={() => activeTalent && openProjectPicker(activeTalent)}
        />

        <TalentNlChatPanel
          filters={filters}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((open) => !open)}
          openRoles={openRoles}
          selectedOpenRoleId={selectedOpenRoleId}
          onOpenRoleChange={applyOpenRole}
          onFiltersChange={applyNlFilters}
        />
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
                      className="w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-white hover:border-[#2dd4bf]/40"
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
