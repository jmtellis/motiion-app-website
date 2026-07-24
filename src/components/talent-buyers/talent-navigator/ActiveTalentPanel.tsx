"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  ChevronsUpDown,
  ClipboardList,
  Download,
  Mail,
  Plus,
  Send,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useTalentOutreachActions } from "@/lib/talent-buyers/use-talent-outreach-actions";
import type { NavigatorFilterOptions } from "@/lib/talent-navigator/filter-options";
import { getTalentProfileHref } from "@/lib/talent-navigator/profile-adapter";
import type { Talent, TalentNavigatorFilters } from "@/lib/talent-navigator/types";

import { Modal } from "../dashboard/Modal";
import { useToast } from "../dashboard/ToastProvider";
import { SaveToCollectionPopover } from "../library/SaveToCollectionPopover";
import {
  BrowseFocusProfileSections,
  PROFILE_VIEW_OPTIONS,
  type FocusMediaPreview,
  type ProfileTab,
} from "./BrowseFocusProfileSections";
import { StyleChips } from "./StyleChips";
import { TalentFilterPanel, type SavedSearchOption } from "./TalentFilterPanel";

type ActiveTalentPanelProps = {
  talent: Talent | null;
  open?: boolean;
  saveOpen?: boolean;
  onSaveOpenChange?: (open: boolean) => void;
  onInvite?: () => void;
  onContact?: () => void;
  onAddToProject?: () => void;
  onClose?: () => void;
  compact?: boolean;
  variant?: "sidebar" | "sheet" | "focus-card";
  /** Browse cover: row title under the card (opens filters). */
  categoryLabel?: string;
  filtersOpen?: boolean;
  onToggleFilters?: () => void;
  filters?: TalentNavigatorFilters;
  filterOptions?: NavigatorFilterOptions;
  savedSearches?: SavedSearchOption[];
  savedSearchId?: string;
  onFiltersChange?: (partial: Partial<TalentNavigatorFilters>) => void;
  onSavedSearchChange?: (id: string) => void;
  onClearFilters?: () => void;
  onSaveSearch?: () => void;
  onDeleteSavedSearch?: () => void;
  onApplyFilters?: () => void;
};

function primaryFocusPreview(talent: Talent): FocusMediaPreview {
  return { kind: "image", id: "headshot-0", url: talent.imageUrl };
}

function talentSaveKeys(talent: Talent) {
  return [talent.professionalProfileId, talent.id, talent.slug].filter(Boolean) as string[];
}

function MetaRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="talent-navigator__meta-row">
      <dt>{label}</dt>
      <dd className={highlight ? "talent-navigator__meta--available" : undefined}>{value}</dd>
    </div>
  );
}

function TalentIdentityHeader({
  talent,
  onClose,
  compactAvatar,
  hideAvatar = false,
  trailing,
}: {
  talent: Talent;
  onClose?: () => void;
  compactAvatar?: boolean;
  hideAvatar?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <div className="talent-navigator__detail-header">
      <div className="talent-navigator__detail-identity">
        {!hideAvatar ? (
          <div
            className={`talent-navigator__detail-avatar${compactAvatar ? " talent-navigator__detail-avatar--compact" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={talent.imageUrl} alt="" />
          </div>
        ) : null}
        <div className="talent-navigator__detail-identity-text">
          <div className="talent-navigator__detail-name-row">
            <h3 className="talent-navigator__detail-name">{talent.name}</h3>
            {talent.pronouns ? (
              <span className="talent-navigator__detail-pronouns">{talent.pronouns}</span>
            ) : null}
          </div>
          <p className="talent-navigator__detail-location">{talent.location ?? "Location TBD"}</p>
        </div>
      </div>
      {trailing ??
        (onClose ? (
          <button
            type="button"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-white/45 hover:bg-white/6 hover:text-white/80"
            onClick={onClose}
            aria-label="Close details"
          >
            <X className="size-4" />
          </button>
        ) : null)}
    </div>
  );
}

function FocusViewMenu({
  tab,
  onTabChange,
}: {
  tab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeLabel = PROFILE_VIEW_OPTIONS.find((item) => item.id === tab)?.label ?? "About";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div className="talent-navigator__focus-view-menu" ref={menuRef}>
      <button
        type="button"
        className="talent-navigator__focus-view-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Profile view"
      >
        <span>{activeLabel}</span>
        <ChevronDown className="size-3.5" aria-hidden />
      </button>
      {open ? (
        <div className="talent-navigator__focus-view-dropdown" role="listbox" aria-label="Profile views">
          {PROFILE_VIEW_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={tab === item.id}
              className={`talent-navigator__focus-view-option${
                tab === item.id ? " talent-navigator__focus-view-option--active" : ""
              }`}
              onClick={() => {
                onTabChange(item.id);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FocusCardFooterActions({
  talent,
  saveOpen,
  setSaveOpen,
  onAddToProject,
  resumeUrl,
  talentUserId,
  categoryLabel,
  filtersOpen = false,
  onToggleFilters,
  onClearFilters,
  onSaveSearch,
  onApplyFilters,
}: {
  talent: Talent | null;
  saveOpen: boolean;
  setSaveOpen: (open: boolean) => void;
  onAddToProject?: () => void;
  resumeUrl: string | null;
  talentUserId: string;
  categoryLabel?: string;
  filtersOpen?: boolean;
  onToggleFilters?: () => void;
  onClearFilters?: () => void;
  onSaveSearch?: () => void;
  onApplyFilters?: () => void;
}) {
  const { showToast } = useToast();
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const contactMenuRef = useRef<HTMLDivElement>(null);

  const outreach = useTalentOutreachActions({
    talentUserId: talentUserId || undefined,
    displayName: talent?.name ?? "Talent",
    onSuccess: (message) => showToast({ message, variant: "success" }),
    onError: (message) => showToast({ message, variant: "error" }),
  });

  useEffect(() => {
    if (!addMenuOpen && !contactMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (addMenuOpen && !addMenuRef.current?.contains(target)) setAddMenuOpen(false);
      if (contactMenuOpen && !contactMenuRef.current?.contains(target)) setContactMenuOpen(false);
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [addMenuOpen, contactMenuOpen]);

  useEffect(() => {
    setAddMenuOpen(false);
    setContactMenuOpen(false);
  }, [talent?.id]);

  const inputClass =
    "w-full rounded-full border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30 focus:outline-none";
  const textareaClass =
    "w-full rounded-[var(--radius-field)] border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30 focus:outline-none";

  if (filtersOpen) {
    return (
      <div className="talent-navigator__focus-card-footer">
        <button
          type="button"
          className="talent-navigator__focus-footer-close"
          onClick={onToggleFilters}
          aria-label="Close filters"
        >
          <X className="size-3.5" aria-hidden />
          <span>Close</span>
        </button>
        <div className="talent-navigator__focus-footer-actions">
          <button
            type="button"
            className="talent-navigator__focus-footer-btn"
            onClick={onClearFilters}
          >
            Clear
          </button>
          <button
            type="button"
            className="talent-navigator__focus-footer-btn"
            onClick={onSaveSearch}
          >
            <Bookmark className="size-3.5" aria-hidden />
            Save search
          </button>
          <button
            type="button"
            className="talent-navigator__focus-footer-btn talent-navigator__focus-footer-btn--primary"
            onClick={onApplyFilters}
          >
            Apply
          </button>
        </div>
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="talent-navigator__focus-card-footer">
        {categoryLabel || onToggleFilters ? (
          <button
            type="button"
            className="talent-navigator__nl-category-btn talent-navigator__focus-footer-category"
            onClick={onToggleFilters}
            aria-pressed={false}
            aria-label={categoryLabel ? `Filters · ${categoryLabel}` : "Show filters"}
          >
            <ChevronsUpDown className="size-3.5" aria-hidden />
            <span className="talent-navigator__nl-category-btn-label">
              {categoryLabel ?? "Filters"}
            </span>
          </button>
        ) : (
          <span className="talent-navigator__focus-footer-spacer" aria-hidden />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="talent-navigator__focus-card-footer">
        {categoryLabel || onToggleFilters ? (
          <button
            type="button"
            className="talent-navigator__nl-category-btn talent-navigator__focus-footer-category"
            onClick={onToggleFilters}
            aria-pressed={false}
            aria-label={
              categoryLabel ? `Filters · ${categoryLabel}` : "Show filters"
            }
          >
            <ChevronsUpDown className="size-3.5" aria-hidden />
            <span className="talent-navigator__nl-category-btn-label">
              {categoryLabel ?? "Filters"}
            </span>
          </button>
        ) : (
          <span className="talent-navigator__focus-footer-spacer" aria-hidden />
        )}

        <div className="talent-navigator__focus-footer-actions">
          <div className="talent-navigator__focus-footer-menu" ref={addMenuRef}>
            <SaveToCollectionPopover
              open={saveOpen}
              onClose={() => setSaveOpen(false)}
              talentIdOrSlug={talentSaveKeys(talent)}
              displayName={talent.name}
              align="left"
              trigger={
                <button
                  type="button"
                  className="talent-navigator__focus-footer-btn"
                  onClick={() => {
                    setSaveOpen(false);
                    setContactMenuOpen(false);
                    setAddMenuOpen((open) => !open);
                  }}
                  aria-expanded={addMenuOpen}
                  aria-haspopup="menu"
                >
                  <Plus className="size-3.5" aria-hidden />
                  Add
                  <ChevronDown className="size-3" aria-hidden />
                </button>
              }
            />
            {addMenuOpen && !saveOpen ? (
              <div className="talent-navigator__focus-footer-dropdown" role="menu" aria-label="Add options">
                <button
                  type="button"
                  role="menuitem"
                  className="talent-navigator__focus-footer-dropdown-item"
                  onClick={() => {
                    setAddMenuOpen(false);
                    onAddToProject?.();
                  }}
                >
                  <CalendarPlus className="size-3.5" aria-hidden />
                  Add to Project
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="talent-navigator__focus-footer-dropdown-item"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setSaveOpen(true);
                  }}
                >
                  <Bookmark className="size-3.5" aria-hidden />
                  Add to Library
                </button>
              </div>
            ) : null}
          </div>

          <div className="talent-navigator__focus-footer-menu" ref={contactMenuRef}>
            <button
              type="button"
              className="talent-navigator__focus-footer-btn"
              onClick={() => {
                setAddMenuOpen(false);
                setContactMenuOpen((open) => !open);
              }}
              aria-expanded={contactMenuOpen}
              aria-haspopup="menu"
              disabled={outreach.isPending || !outreach.canReachTalent}
            >
              <Mail className="size-3.5" aria-hidden />
              Contact
              <ChevronDown className="size-3" aria-hidden />
            </button>
            {contactMenuOpen ? (
              <div
                className="talent-navigator__focus-footer-dropdown"
                role="menu"
                aria-label="Contact options"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="talent-navigator__focus-footer-dropdown-item"
                  onClick={() => {
                    setContactMenuOpen(false);
                    outreach.handleMessage();
                  }}
                >
                  <Mail className="size-3.5" aria-hidden />
                  Message
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="talent-navigator__focus-footer-dropdown-item"
                  onClick={() => {
                    setContactMenuOpen(false);
                    outreach.openAvailabilityModal();
                  }}
                >
                  <CalendarClock className="size-3.5" aria-hidden />
                  Request availability
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="talent-navigator__focus-footer-dropdown-item"
                  onClick={() => {
                    setContactMenuOpen(false);
                    outreach.openSizeSheetModal();
                  }}
                >
                  <ClipboardList className="size-3.5" aria-hidden />
                  Ask for sizing
                </button>
              </div>
            ) : null}
          </div>

          {resumeUrl ? (
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="talent-navigator__focus-footer-btn"
              download
            >
              <Download className="size-3.5" aria-hidden />
              Download resume
            </a>
          ) : (
            <button
              type="button"
              className="talent-navigator__focus-footer-btn"
              disabled
              aria-disabled="true"
              title="Resume not available"
            >
              <Download className="size-3.5" aria-hidden />
              Download resume
            </button>
          )}
        </div>
      </div>

      <Modal
        open={outreach.availabilityModalOpen}
        onClose={() => outreach.setAvailabilityModalOpen(false)}
        title="Ask Availability"
        description={`Send an availability check to ${talent.name}.`}
        footer={
          <button
            type="button"
            className="bd-btn-accent"
            disabled={outreach.isPending}
            onClick={outreach.handleAvailabilitySubmit}
          >
            Send request
          </button>
        }
      >
        <div className="space-y-3">
          <input
            type="text"
            className={inputClass}
            value={outreach.availabilityTitle}
            onChange={(event) => outreach.setAvailabilityTitle(event.target.value)}
            placeholder="Request title"
          />
          <input
            type="text"
            className={inputClass}
            value={outreach.availabilityProject}
            onChange={(event) => outreach.setAvailabilityProject(event.target.value)}
            placeholder="Project name (optional)"
          />
          <textarea
            className={`${textareaClass} min-h-24 resize-y`}
            value={outreach.availabilityMessage}
            onChange={(event) => outreach.setAvailabilityMessage(event.target.value)}
            placeholder="Dates, notes, or context (optional)"
          />
        </div>
      </Modal>

      <Modal
        open={outreach.sizeSheetModalOpen}
        onClose={() => outreach.setSizeSheetModalOpen(false)}
        title="Request Size Sheet"
        description={`Ask ${talent.name} to share their measurements.`}
        footer={
          <button
            type="button"
            className="bd-btn-accent"
            disabled={outreach.isPending}
            onClick={outreach.handleSizeSheetSubmit}
          >
            Send request
          </button>
        }
      >
        <textarea
          className={`${textareaClass} min-h-24 resize-y`}
          value={outreach.sizeSheetMessage}
          onChange={(event) => outreach.setSizeSheetMessage(event.target.value)}
          placeholder="Optional note for the talent"
        />
      </Modal>
      {outreach.identityGate}
    </>
  );
}

function ProfileFields({ talent }: { talent: Talent }) {
  return (
    <>
      <StyleChips key={talent.id} styles={talent.styles} />

      <dl>
        {talent.agency ? <MetaRow label="Agency" value={talent.agency} /> : null}
        {talent.height ? <MetaRow label="Height" value={talent.height} /> : null}
        {talent.availability ? (
          <MetaRow
            label="Availability"
            value={
              talent.availability.toLowerCase().includes("available")
                ? "Available Now"
                : talent.availability
            }
            highlight={talent.availability.toLowerCase().includes("available")}
          />
        ) : null}
        {talent.unionStatus ? <MetaRow label="Union Status" value={talent.unionStatus} /> : null}
        {talent.experience ? <MetaRow label="Experience" value={talent.experience} /> : null}
      </dl>

      {talent.matchingCredits?.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-white/45">Matched because</p>
          <ul className="space-y-2">
            {talent.matchingCredits.slice(0, 2).map((credit) => (
              <li
                key={credit.id}
                className="rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-xs text-white/75"
              >
                <p className="font-medium text-white/90">
                  {[credit.productionName, credit.role ? `— ${credit.role}` : null]
                    .filter(Boolean)
                    .join(" ")}
                </p>
                <p className="mt-1 text-white/50">
                  {[
                    credit.artistName ? `Artist: ${credit.artistName}` : null,
                    credit.choreographerName
                      ? `Choreographer: ${credit.choreographerName}`
                      : null,
                    credit.creditYear,
                    credit.verificationLabel,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
          {(talent.matchingCreditCount ?? talent.matchingCredits.length) > 2 ? (
            <p className="text-xs text-white/45">
              View {talent.matchingCreditCount ?? talent.matchingCredits.length} matching credits
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function ProfileActions({
  talent,
  saveOpen,
  setSaveOpen,
  onInvite,
  onContact,
  onAddToProject,
}: {
  talent: Talent;
  saveOpen: boolean;
  setSaveOpen: (open: boolean) => void;
  onInvite?: () => void;
  onContact?: () => void;
  onAddToProject?: () => void;
}) {
  return (
    <div className="talent-navigator__detail-actions">
      <Link
        href={getTalentProfileHref(talent)}
        className="talent-navigator__action-btn talent-navigator__action-btn--accent talent-navigator__action-btn--block talent-navigator__action-btn--full"
      >
        View Profile
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
      <SaveToCollectionPopover
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        talentIdOrSlug={talentSaveKeys(talent)}
        displayName={talent.name}
        align="left"
        anchorClassName="w-full"
        trigger={
          <button
            type="button"
            className="talent-navigator__action-btn talent-navigator__action-btn--block w-full"
            onClick={() => setSaveOpen(!saveOpen)}
          >
            <Bookmark className="size-3.5" aria-hidden />
            Save
          </button>
        }
      />
      <button
        type="button"
        className="talent-navigator__action-btn talent-navigator__action-btn--block"
        onClick={onAddToProject}
      >
        <CalendarPlus className="size-3.5" aria-hidden />
        Add to Project
      </button>
      <button
        type="button"
        className="talent-navigator__action-btn talent-navigator__action-btn--block"
        onClick={onInvite}
      >
        <Send className="size-3.5" aria-hidden />
        Just Invite
      </button>
      <button
        type="button"
        className="talent-navigator__action-btn talent-navigator__action-btn--block"
        onClick={onContact}
      >
        <Mail className="size-3.5" aria-hidden />
        Contact
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <p className="text-sm text-white/45">Select a dancer to view details.</p>
    </div>
  );
}

export function ActiveTalentPanel({
  talent,
  open = false,
  saveOpen: saveOpenControlled,
  onSaveOpenChange,
  onInvite,
  onContact,
  onAddToProject,
  onClose,
  compact = false,
  variant = "sidebar",
  categoryLabel,
  filtersOpen = false,
  onToggleFilters,
  filters,
  filterOptions,
  savedSearches = [],
  savedSearchId = "",
  onFiltersChange,
  onSavedSearchChange,
  onClearFilters,
  onSaveSearch,
  onDeleteSavedSearch,
  onApplyFilters,
}: ActiveTalentPanelProps) {
  const [saveOpenInternal, setSaveOpenInternal] = useState(false);
  const saveOpen = saveOpenControlled ?? saveOpenInternal;
  const setSaveOpen = onSaveOpenChange ?? setSaveOpenInternal;
  const useCompactHeader = variant === "sidebar" || compact;
  const [focusPreview, setFocusPreview] = useState<FocusMediaPreview | null>(null);
  const [projectDetailOpen, setProjectDetailOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<ProfileTab>("about");
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [talentUserId, setTalentUserId] = useState("");

  useEffect(() => {
    setSaveOpenInternal(false);
  }, [talent?.id]);

  useEffect(() => {
    setFocusPreview(talent ? primaryFocusPreview(talent) : null);
    setProjectDetailOpen(false);
    setProfileTab("about");
    setResumeUrl(null);
    setTalentUserId("");
  }, [talent?.id, talent?.imageUrl]);

  const activeFocusPreview =
    focusPreview ?? (talent ? primaryFocusPreview(talent) : null);

  let body: ReactNode;

  if (variant === "focus-card" && filtersOpen && filters && filterOptions && onFiltersChange) {
    body = (
      <div className="talent-navigator__focus-card-stack">
        <article className="talent-navigator__focus-card talent-navigator__focus-card--filters">
          <TalentFilterPanel
            variant="embedded"
            open
            filters={filters}
            filterOptions={filterOptions}
            savedSearches={savedSearches}
            savedSearchId={savedSearchId}
            onChange={onFiltersChange}
            onSavedSearchChange={onSavedSearchChange ?? (() => undefined)}
            onClear={onClearFilters ?? (() => undefined)}
            onDeleteSavedSearch={onDeleteSavedSearch}
          />
        </article>

        <FocusCardFooterActions
          talent={talent}
          saveOpen={saveOpen}
          setSaveOpen={setSaveOpen}
          onAddToProject={onAddToProject}
          resumeUrl={resumeUrl}
          talentUserId={talentUserId || talent?.id || ""}
          categoryLabel={categoryLabel}
          filtersOpen
          onToggleFilters={onToggleFilters}
          onClearFilters={onClearFilters}
          onSaveSearch={onSaveSearch}
          onApplyFilters={onApplyFilters ?? onToggleFilters}
        />
      </div>
    );
  } else if (!talent) {
    body = <EmptyState />;
  } else if (variant === "focus-card") {
    body = (
      <div key={talent.id} className="talent-navigator__focus-card-stack">
        <article className="talent-navigator__focus-card">
          <div className="talent-navigator__focus-card-photo">
            {activeFocusPreview?.kind === "video" ? (
              <video
                key={activeFocusPreview.id}
                src={activeFocusPreview.url}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeFocusPreview?.url ?? talent.imageUrl} alt="" />
            )}
          </div>
          <div className="talent-navigator__focus-card-body">
            {projectDetailOpen ? null : (
              <TalentIdentityHeader
                talent={talent}
                hideAvatar
                trailing={
                  <FocusViewMenu
                    tab={profileTab}
                    onTabChange={(next) => {
                      setProfileTab(next);
                      setFocusPreview(primaryFocusPreview(talent));
                      setProjectDetailOpen(false);
                    }}
                  />
                }
              />
            )}
            <div
              className={`talent-navigator__focus-card-content${
                projectDetailOpen ? " talent-navigator__focus-card-content--project" : ""
              }`}
            >
              <BrowseFocusProfileSections
                slugOrId={talent.slug || talent.id}
                selectedMediaId={activeFocusPreview?.id ?? null}
                primaryPreview={primaryFocusPreview(talent)}
                onSelectMedia={setFocusPreview}
                onProjectDetailOpenChange={setProjectDetailOpen}
                tab={profileTab}
                onTabChange={(next) => {
                  setProfileTab(next);
                  setFocusPreview(primaryFocusPreview(talent));
                  setProjectDetailOpen(false);
                }}
                onProfileMeta={(meta) => {
                  setResumeUrl(meta.resumeUrl);
                  setTalentUserId(meta.talentUserId);
                }}
              />
            </div>
          </div>
        </article>

        {!projectDetailOpen ? (
          <FocusCardFooterActions
            talent={talent}
            saveOpen={saveOpen}
            setSaveOpen={setSaveOpen}
            onAddToProject={onAddToProject}
            resumeUrl={resumeUrl}
            talentUserId={talentUserId || talent.id}
            categoryLabel={categoryLabel}
            filtersOpen={filtersOpen}
            onToggleFilters={onToggleFilters}
            onClearFilters={onClearFilters}
            onSaveSearch={onSaveSearch}
            onApplyFilters={onApplyFilters}
          />
        ) : null}
      </div>
    );
  } else {
    body = (
      <div key={talent.id} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <TalentIdentityHeader
          talent={talent}
          onClose={onClose}
          compactAvatar={useCompactHeader}
        />

        {!useCompactHeader ? (
          <div className="mx-4 mt-3 overflow-hidden rounded-xl border border-white/8 bg-black/50">
            <div className="relative aspect-[3/4] max-h-48 w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={talent.imageUrl} alt="" className="h-full w-full object-contain object-center" />
            </div>
          </div>
        ) : null}

        <div className="space-y-3 px-4 py-3">
          <ProfileFields talent={talent} />
          <ProfileActions
            talent={talent}
            saveOpen={saveOpen}
            setSaveOpen={setSaveOpen}
            onInvite={onInvite}
            onContact={onContact}
            onAddToProject={onAddToProject}
          />
        </div>
      </div>
    );
  }

  if (variant === "sheet") {
    return (
      <div className="flex min-h-0 flex-col overflow-hidden" aria-label="Talent details">
        {body}
      </div>
    );
  }

  if (variant === "focus-card") {
    return (
      <div
        className={`talent-navigator__focus-card-wrap${open ? " talent-navigator__focus-card-wrap--open" : ""}`}
        aria-label="Talent details"
        aria-hidden={!open}
      >
        {body}
      </div>
    );
  }

  return (
    <div
      className={`talent-navigator__detail-wrap${open ? " talent-navigator__detail-wrap--open" : ""}`}
      aria-label="Talent details"
      aria-hidden={!open}
    >
      <div className="talent-navigator__detail-card">{body}</div>
    </div>
  );
}
