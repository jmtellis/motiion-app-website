"use client";

import { VoiceSearchControl } from "./VoiceSearchControl";
import { BadgeCheck, Check, ChevronDown, ChevronLeft, ChevronRight, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";

import { useDiscoverTalent } from "@/components/app/discover-selection";
import { ChipGroup } from "@/components/ui/ChipGroup";
import { talentSubtypeOptions } from "@/lib/mock-data";
import { explicitWorkedWith, pickCreditRewrite } from "@/lib/talent-navigator/credit-intent";
import {
  ETHNICITY_OPTIONS,
  EYE_COLOR_OPTIONS,
  GENDER_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HEIGHT_OPTIONS,
  REPRESENTATION_OPTIONS,
  ROLE_GENRE_OPTIONS,
  ROLE_SKILL_OPTIONS,
  UNION_STATUS_OPTIONS,
} from "@/lib/talent-navigator/filter-options";
import { searchProfileToTalent } from "@/lib/talent-navigator/profile-adapter";
import { suggestCreditCollaborators } from "@/lib/talent/discover-actions";
import type { SearchFilters, SearchProfileRecord, SearchResult } from "@/types/search";
import { ProductEmptyState } from "@/components/ui/EmptyState";

export type DiscoverBrowseAttributes = {
  location: string;
  gender: string;
  height: string;
  union: string;
  rep: string;
  skills: string[];
  ethnicity: string[];
  hair: string[];
  eyes: string[];
};

type Attributes = DiscoverBrowseAttributes;

type BrowseQuery = Attributes & {
  keyword: string;
  location: string;
  subtype: string;
  styles: string[];
  page: number;
};

export const EMPTY_DISCOVER_ATTRIBUTES: Attributes = {
  location: "",
  gender: "",
  height: "",
  union: "",
  rep: "",
  skills: [],
  ethnicity: [],
  hair: [],
  eyes: [],
};
const EMPTY_ATTRIBUTES = EMPTY_DISCOVER_ATTRIBUTES;

export function countDiscoverAttributes(attributes: Attributes) {
  return Object.values(attributes).reduce(
    (total, value) => total + (Array.isArray(value) ? value.length : value ? 1 : 0),
    0,
  );
}
const countAttributes = countDiscoverAttributes;

function buildHref(basePath: string, query: BrowseQuery, credit?: string) {
  const params = new URLSearchParams();
  params.set("view", "explore");
  params.set("layout", "list");
  if (credit) params.set("credit", credit);
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.location) params.set("location", query.location);
  if (query.subtype) params.set("subtype", query.subtype);
  if (query.styles.length) params.set("styles", query.styles.join(","));
  for (const key of ["gender", "height", "union", "rep"] as const) {
    if (query[key]) params.set(key, query[key]);
  }
  for (const key of ["skills", "ethnicity", "hair", "eyes"] as const) {
    if (query[key].length) params.set(key, query[key].join(","));
  }
  if (query.page > 1) params.set("page", String(query.page));
  return `${basePath}?${params}`;
}

/** 1 … 4 5 6 … 42 */
function pageWindow(page: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((value) => value >= 1 && value <= total));
  if (page <= 3) [2, 3, 4].forEach((value) => value <= total && pages.add(value));
  if (page >= total - 2) [total - 3, total - 2, total - 1].forEach((value) => value >= 1 && pages.add(value));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((value, index) =>
    index > 0 && value - sorted[index - 1] > 1 ? (["gap", value] as const) : [value],
  );
}

function BrowseCard({
  profile,
  onOpen,
  active = false,
}: {
  profile: SearchProfileRecord;
  onOpen: () => void;
  active?: boolean;
}) {
  const name = profile.display_name || profile.full_name || "Talent profile";
  const image = profile.headshot_url || profile.headshot_urls?.[0];
  const detail = [...new Set([...(profile.talent_types ?? []), ...(profile.styles ?? [])])].slice(0, 2).join(" · ");

  return (
    <button
      type="button"
      className={`discover-browse-card${active ? " discover-browse-card--active" : ""}`}
      aria-label={`Open ${name} profile`}
      aria-pressed={active}
      onClick={onOpen}
    >
      <span className="discover-browse-card__photo">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" />
        ) : (
          <span className="discover-browse-card__initial">{name.charAt(0)}</span>
        )}
        {profile.is_verified ? (
          <span className="discover-browse-card__verified" aria-label="Verified">
            <BadgeCheck size={14} aria-hidden />
          </span>
        ) : null}
      </span>
      <span className="discover-browse-card__copy">
        <strong>{name}</strong>
        <small>
          <MapPin size={12} aria-hidden />
          {profile.location || "Location TBD"}
        </small>
        {detail ? <em>{detail}</em> : null}
      </span>
    </button>
  );
}

/** Closes a popover on outside pointer or Escape, returning focus to its trigger. */
function useDismiss(open: boolean, rootRef: RefObject<HTMLDivElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
      rootRef.current?.querySelector<HTMLElement>("[aria-expanded]")?.focus();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, rootRef, close]);
}

const TYPE_OPTIONS = [{ value: "", label: "All talent" }, ...talentSubtypeOptions];

export function TypeFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = TYPE_OPTIONS.find((option) => option.value === value) ?? TYPE_OPTIONS[0];
  useDismiss(open, rootRef, () => setOpen(false));

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [open]);

  function onMenuKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "ArrowDown" ? (index + 1) % items.length
        : event.key === "ArrowUp" ? (index - 1 + items.length) % items.length
          : event.key === "Home" ? 0
            : event.key === "End" ? items.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    items[next]?.focus();
  }

  return (
    <div className="discover-styles" ref={rootRef}>
      <button
        type="button"
        className="ui-chip discover-styles__trigger"
        aria-pressed={Boolean(value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Talent type: ${selected.label}`}
        onClick={() => setOpen((current) => !current)}
      >
        {selected.label}
        <ChevronDown size={14} aria-hidden className="discover-styles__chevron" />
      </button>
      {open ? (
        <div ref={menuRef} className="discover-styles__popover discover-type-menu" role="menu" aria-label="Talent type" onKeyDown={onMenuKey}>
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              className="discover-type-menu__item"
              onClick={() => {
                setOpen(false);
                if (option.value !== value) onChange(option.value);
              }}
            >
              {option.label}
              {option.value === value ? <Check size={15} aria-hidden /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FilterPopover({
  label,
  icon,
  active,
  title,
  hint,
  canClear,
  applyCount,
  onOpen,
  onClear,
  onApply,
  children,
}: {
  label: string;
  icon?: ReactNode;
  active: boolean;
  title: string;
  hint?: string;
  canClear: boolean;
  applyCount: number;
  onOpen: () => void;
  onClear: () => void;
  onApply: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(open, rootRef, () => setOpen(false));

  return (
    <div className="discover-styles" ref={rootRef}>
      <button
        type="button"
        className="ui-chip discover-styles__trigger"
        aria-pressed={active}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (!open) onOpen();
          setOpen((current) => !current);
        }}
      >
        {icon}
        {label}
        <ChevronDown size={14} aria-hidden className="discover-styles__chevron" />
      </button>
      {open ? (
        <div className="discover-styles__popover" role="dialog" aria-label={title}>
          <div className="discover-styles__head">
            <strong>{title}</strong>
            {hint ? <span>{hint}</span> : null}
          </div>
          <div className="discover-styles__body">{children}</div>
          <div className="discover-styles__foot">
            <button type="button" className="discover-styles__clear" disabled={!canClear} onClick={onClear}>
              Clear
            </button>
            <button
              type="button"
              className="discover-styles__apply"
              onClick={() => {
                setOpen(false);
                onApply();
              }}
            >
              {applyCount ? `Apply ${applyCount}` : "Apply"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StylesFilter({ value, onApply }: { value: string[]; onApply: (styles: string[]) => void }) {
  const [draft, setDraft] = useState(value);
  const label = value.length === 0 ? "Styles" : value.length === 1 ? value[0] : `Styles · ${value.length}`;

  return (
    <FilterPopover
      label={label}
      active={value.length > 0}
      title="Styles"
      hint="Match any selected"
      canClear={draft.length > 0}
      applyCount={draft.length}
      onOpen={() => setDraft(value)}
      onClear={() => setDraft([])}
      onApply={() => onApply(draft)}
    >
      <ChipGroup multiple ariaLabel="Styles" options={ROLE_GENRE_OPTIONS} value={draft} collapsedCount={12} onChange={setDraft} />
    </FilterPopover>
  );
}

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="discover-filter-section">
      <h3>{label}</h3>
      {children}
    </section>
  );
}

export function AttributesFilter({ value, onApply }: { value: Attributes; onApply: (attributes: Attributes) => void }) {
  const [draft, setDraft] = useState(value);
  const applied = countAttributes(value);
  const drafted = countAttributes(draft);
  const set = <K extends keyof Attributes>(key: K) => (next: Attributes[K]) => setDraft((current) => ({ ...current, [key]: next }));

  return (
    <FilterPopover
      label={applied ? `Filters · ${applied}` : "Filters"}
      icon={<SlidersHorizontal size={14} aria-hidden />}
      active={applied > 0}
      title="Filters"
      canClear={drafted > 0}
      applyCount={drafted}
      onOpen={() => setDraft(value)}
      onClear={() => setDraft(EMPTY_ATTRIBUTES)}
      onApply={() => onApply(draft)}
    >
      <FilterSection label="Location">
        <input aria-label="Location" placeholder="City or region" className="workspace-bare-input" value={draft.location} onChange={(event) => set("location")(event.target.value)} />
      </FilterSection>
      <FilterSection label="Gender">
        <ChipGroup includeAny ariaLabel="Gender" options={GENDER_OPTIONS} value={draft.gender} onChange={set("gender")} />
      </FilterSection>
      <FilterSection label="Height">
        <ChipGroup includeAny ariaLabel="Height" options={HEIGHT_OPTIONS} value={draft.height} onChange={set("height")} />
      </FilterSection>
      <FilterSection label="Representation">
        <ChipGroup includeAny ariaLabel="Representation" options={REPRESENTATION_OPTIONS} value={draft.rep} onChange={set("rep")} />
      </FilterSection>
      <FilterSection label="Union">
        <ChipGroup includeAny ariaLabel="Union" options={UNION_STATUS_OPTIONS} value={draft.union} onChange={set("union")} />
      </FilterSection>
      <FilterSection label="Skills">
        <ChipGroup multiple ariaLabel="Skills" options={ROLE_SKILL_OPTIONS} value={draft.skills} collapsedCount={8} onChange={set("skills")} />
      </FilterSection>
      <FilterSection label="Ethnicity">
        <ChipGroup multiple ariaLabel="Ethnicity" options={ETHNICITY_OPTIONS} value={draft.ethnicity} collapsedCount={4} onChange={set("ethnicity")} />
      </FilterSection>
      <FilterSection label="Hair">
        <ChipGroup multiple ariaLabel="Hair color" options={HAIR_COLOR_OPTIONS} value={draft.hair} onChange={set("hair")} />
      </FilterSection>
      <FilterSection label="Eyes">
        <ChipGroup multiple ariaLabel="Eye color" options={EYE_COLOR_OPTIONS} value={draft.eyes} onChange={set("eyes")} />
      </FilterSection>
    </FilterPopover>
  );
}

export function DiscoverView({
  filters,
  result,
  credit = "",
  basePath = "/discover",
}: {
  filters: SearchFilters;
  result: SearchResult;
  credit?: string;
  basePath?: string;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);
  const [pending, startTransition] = useTransition();
  const { openTalent, lookupTalent, selectedTalentId } = useDiscoverTalent();
  const totalPages = Math.max(1, Math.ceil(result.total / Math.max(result.pageSize, 1)));
  const attributes: Attributes = {
    location: filters.location ?? "",
    gender: filters.gender ?? "",
    height: filters.height ?? "",
    union: filters.unionStatus ?? "",
    rep: filters.representation ?? "",
    skills: filters.skills ?? [],
    ethnicity: filters.ethnicities ?? [],
    hair: filters.hairColors ?? [],
    eyes: filters.eyeColors ?? [],
  };
  const current: BrowseQuery = {
    ...attributes,
    keyword: filters.keyword ?? "",
    location: filters.location ?? "",
    subtype: filters.subtype ?? "",
    styles: filters.styles ?? (filters.style ? [filters.style] : []),
    page: result.page,
  };
  const queryKey = buildHref(basePath, current, credit);
  const [draft, setDraft] = useState<{ key: string; value: string } | null>(null);
  const searchValue = draft?.key === queryKey ? draft.value : current.keyword;
  function updateSearch(value: string) { requestVersion.current += 1; setDraft({ key: queryKey, value }); }
  useEffect(() => () => { requestVersion.current += 1; }, [queryKey]);

  useEffect(() => {
    rootRef.current?.closest(".talent-discovery-results")?.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [result.page]);

  function go(next: Partial<BrowseQuery>, keepCredit = true) {
    requestVersion.current += 1;
    const href = buildHref(basePath, { ...current, page: 1, ...next }, keepCredit ? credit : "");
    startTransition(() => router.push(href, { scroll: false }));
  }

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestId = ++requestVersion.current;
    const form = new FormData(event.currentTarget);
    const keyword = String(form.get("keyword") ?? "").trim();
    const explicit = explicitWorkedWith(keyword);
    const names = !explicit && keyword.length >= 2 ? await suggestCreditCollaborators(keyword).catch(() => []) : [];
    if (requestId !== requestVersion.current) return;
    const creditName = explicit ?? pickCreditRewrite(keyword, names);
    const href = buildHref(basePath, { ...current, keyword: creditName ? "" : keyword, page: 1 }, creditName ?? "");
    startTransition(() => router.push(href, { scroll: false }));
  }

  const start = (result.page - 1) * result.pageSize + 1;
  const end = Math.min(result.total, start + result.items.length - 1);
  const hasFilters = Boolean(
    current.keyword || current.location || current.subtype || current.styles.length || countAttributes(attributes) || credit,
  );

  return (
    <div className="discover-browse" ref={rootRef}>
      <div className="discover-browse__toolbar">
        <form key={queryKey} className="discover-browse__filters" onSubmit={(event) => void onSearch(event)}>
          <TypeFilter value={current.subtype} onChange={(subtype) => go({ subtype })} />
          <StylesFilter value={current.styles} onApply={(styles) => go({ styles })} />
          <AttributesFilter value={attributes} onApply={(next) => go(next)} />
          <label className="discover-browse__field discover-browse__field--search">
            <input
              name="keyword"
              ref={searchInputRef}
              value={searchValue}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Name, style, skill"
              aria-label="Search by name, style, or skill"
              className="workspace-bare-input"
              enterKeyHint="search"
            />
          </label>
          <VoiceSearchControl onTranscript={(text) => { updateSearch(text); searchInputRef.current?.focus(); }} />
          <button type="submit" className="discover-browse__submit" aria-label="Search" title="Search" disabled={pending}>
            <Search size={16} aria-hidden />
          </button>
        </form>
      </div>

      <div className="discover-browse__bar">
        <p aria-live="polite">
          {credit ? `Worked with ${credit} · ` : ""}
          {result.total > 0
            ? totalPages > 1
              ? `${start.toLocaleString()}–${end.toLocaleString()} of ${result.total.toLocaleString()} profiles`
              : `${result.total.toLocaleString()} ${result.total === 1 ? "profile" : "profiles"}`
            : result.source === "unavailable" ? "Search unavailable" : "No matches"}
        </p>
        {hasFilters ? (
          <button type="button" className="discover-browse__reset" onClick={() => startTransition(() => router.push(`${basePath}?view=explore&layout=list`, { scroll: false }))}>
            <X size={13} aria-hidden />
            Clear filters
          </button>
        ) : null}
      </div>

      {result.source === "unavailable" ? <div role="alert" className="ui-notice" data-tone="error">Search could not load. Your filters are preserved. <button type="button" className="underline" onClick={() => router.refresh()}>Retry</button></div> : null}

      <div className="discover-browse__results" data-pending={pending || undefined} aria-busy={pending}>
        {result.items.length ? (
          <div key={queryKey} className="discover-browse__grid discover-skel-enter">
            {result.items.map((item) => (
              <BrowseCard
                key={item.id}
                profile={item}
                active={selectedTalentId === item.id}
                onOpen={() => openTalent(lookupTalent(item.id) ?? searchProfileToTalent(item, 0))}
              />
            ))}
          </div>
        ) : result.source !== "unavailable" ? (
          <div key={queryKey} className="discover-skel-enter">
            <ProductEmptyState
              illustration="search"
              title="No matches for this search"
              description={credit ? `No talent found who worked with ${credit}.` : "Try broadening location or removing a filter."}
              actionLabel="Clear filters"
              actionHref={`${basePath}?view=explore&layout=list`}
            />
          </div>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <nav aria-label="Browse pages" className="discover-browse__pages">
          <button
            type="button"
            className="discover-browse__page discover-browse__page--step"
            aria-label="Previous page"
            disabled={result.page <= 1}
            onClick={() => go({ page: result.page - 1 }, true)}
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          {pageWindow(result.page, totalPages).map((item, index) =>
            item === "gap" ? (
              <span key={`gap-${index}`} className="discover-browse__gap" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className="discover-browse__page"
                aria-current={item === result.page ? "page" : undefined}
                aria-label={`Page ${item}`}
                onClick={() => item !== result.page && go({ page: item }, true)}
              >
                {item}
              </button>
            ),
          )}
          <button
            type="button"
            className="discover-browse__page discover-browse__page--step"
            aria-label="Next page"
            disabled={result.page >= totalPages}
            onClick={() => go({ page: result.page + 1 }, true)}
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </nav>
      ) : null}
    </div>
  );
}
