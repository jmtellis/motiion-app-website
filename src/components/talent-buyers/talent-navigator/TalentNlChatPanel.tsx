"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Briefcase, ChevronDown, ChevronsUpDown, Loader2, Users, X } from "lucide-react";

import {
  applyNavigatorClarification,
  applyNavigatorRelaxation,
  parseNlTalentQuery,
  removeNavigatorBriefToken,
  resolveCreditEntityChoice,
  resolveReferenceProfileChoice,
} from "@/app/(buyer-app)/(paid)/talent/actions";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { getProfileInitials } from "@/lib/auth/avatar";
import type { BuyerOpenRole } from "@/lib/talent-navigator/open-roles";
import type { SearchIntent } from "@/lib/talent-navigator/search-intent";
import type { Talent, TalentNavigatorFilters } from "@/lib/talent-navigator/types";

import { ClarificationChips } from "./ClarificationChips";
import { InterpretedBrief } from "./InterpretedBrief";
import { TalentNlComposeBar } from "./TalentNlComposeBar";

const RESULT_CARD_LIMIT = 12;

type TalentResultCard = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  location?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: SearchIntent;
  talentResults?: TalentResultCard[];
  emptyResults?: boolean;
  ambiguousChoices?: Array<{
    requestedName: string;
    role: "artist" | "choreographer" | "production";
    candidates: Array<{ id: string; name: string; type: string; score: number }>;
  }>;
  ambiguousProfiles?: Array<{
    requestedName: string;
    candidates: Array<{
      id: string;
      name: string;
      height: string | null;
      location: string | null;
      score: number;
    }>;
  }>;
  relaxationSuggestions?: Array<{ id: string; label: string }>;
  degraded?: boolean;
};

type TalentNlChatPanelProps = {
  filters: TalentNavigatorFilters;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  openRoles: BuyerOpenRole[];
  selectedOpenRoleId: string;
  onOpenRoleChange: (roleId: string) => void;
  onFiltersChange: (filters: TalentNavigatorFilters, resetNavigation: boolean) => void;
  onTalentPoolChange?: (talent: Talent[]) => void;
  onDismissChat: () => void;
  onOpenProfile: (talent: Pick<Talent, "id" | "slug" | "name" | "imageUrl">) => void;
  /** Called when a chat session starts/ends so the page can dim the grid. */
  onChatSessionChange?: (active: boolean) => void;
  /** Full-screen chat overlay (after first message). */
  sessionOverlayVisible?: boolean;
  /** Bottom compose bar on Discover before the first message. */
  composeVisible?: boolean;
  /** Active category row label shown on the filters chip. */
  categoryLabel?: string;
  /** Discover chat panel mounted. */
  open?: boolean;
};

function toResultCards(talent: Talent[]): TalentResultCard[] {
  return talent.slice(0, RESULT_CARD_LIMIT).map((person) => ({
    id: person.id,
    slug: person.slug,
    name: person.name,
    imageUrl: person.imageUrl,
    location: person.location,
  }));
}

const WORKED_WITH_ARTISTS = [
  "Beyoncé",
  "Taylor Swift",
  "Usher",
  "Doja Cat",
  "Rihanna",
  "Billie Eilish",
] as const;

const WORKED_WITH_CHOREOGRAPHERS = [
  "Sean Bankhead",
  "JaQuel Knight",
  "Tyce Diorio",
  "Brian Friedman",
  "Kiel Tutin",
  "Charm La'Donna",
] as const;

function PortraitResultCard({
  person,
  onOpenProfile,
}: {
  person: TalentResultCard;
  onOpenProfile: (talent: Pick<Talent, "id" | "slug" | "name" | "imageUrl">) => void;
}) {
  const initials = getProfileInitials(person.name);
  return (
    <button
      type="button"
      className="talent-navigator__nl-portrait-card"
      onClick={() => onOpenProfile(person)}
      aria-label={`View profile for ${person.name}`}
    >
      <span className="talent-navigator__nl-portrait-photo">
        {person.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className="talent-navigator__nl-portrait-fallback" aria-hidden>
            {initials || "?"}
          </span>
        )}
      </span>
      <span className="talent-navigator__nl-portrait-name">{person.name}</span>
      {person.location ? (
        <span className="talent-navigator__nl-portrait-location">{person.location}</span>
      ) : null}
    </button>
  );
}

function PortraitResultsStack({
  people,
  onOpenProfile,
}: {
  people: TalentResultCard[];
  onOpenProfile: (talent: Pick<Talent, "id" | "slug" | "name" | "imageUrl">) => void;
}) {
  const [expanded, setExpanded] = useState(people.length <= 1);
  const lead = people[0];
  const extraCount = Math.max(0, people.length - 1);
  const peekPeople = people.slice(1, 3);

  if (!lead) return null;

  if (expanded || people.length === 1) {
    return (
      <div
        className="talent-navigator__nl-portrait-results talent-navigator__nl-portrait-results--expanded"
        aria-label={`${people.length} matching dancers`}
      >
        {people.map((person) => (
          <PortraitResultCard key={person.id} person={person} onOpenProfile={onOpenProfile} />
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="talent-navigator__nl-portrait-stack"
      onClick={() => setExpanded(true)}
      aria-expanded={false}
      aria-label={`Show ${people.length} matching dancers`}
    >
      <span className="talent-navigator__nl-portrait-stack-layers" aria-hidden>
        {peekPeople.map((person, index) => (
          <span
            key={person.id}
            className={`talent-navigator__nl-portrait-stack-peek talent-navigator__nl-portrait-stack-peek--${index + 1}`}
          >
            {person.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={person.imageUrl} alt="" loading="lazy" />
            ) : (
              <span className="talent-navigator__nl-portrait-fallback">
                {getProfileInitials(person.name) || "?"}
              </span>
            )}
          </span>
        ))}
      </span>

      <span className="talent-navigator__nl-portrait-stack-lead">
        <span className="talent-navigator__nl-portrait-photo">
          {lead.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lead.imageUrl} alt="" loading="lazy" />
          ) : (
            <span className="talent-navigator__nl-portrait-fallback" aria-hidden>
              {getProfileInitials(lead.name) || "?"}
            </span>
          )}
          <span className="talent-navigator__nl-portrait-stack-badge">+{extraCount}</span>
        </span>
        <span className="talent-navigator__nl-portrait-name">{lead.name}</span>
        {lead.location ? (
          <span className="talent-navigator__nl-portrait-location">{lead.location}</span>
        ) : null}
      </span>
    </button>
  );
}

export function TalentNlChatPanel({
  filters,
  filtersOpen,
  onToggleFilters,
  openRoles,
  selectedOpenRoleId,
  onOpenRoleChange,
  onFiltersChange,
  onTalentPoolChange,
  onDismissChat,
  onOpenProfile,
  onChatSessionChange,
  sessionOverlayVisible = false,
  composeVisible = true,
  categoryLabel,
  open = true,
}: TalentNlChatPanelProps) {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [workedWithMenuOpen, setWorkedWithMenuOpen] = useState(false);
  const [workedWithTab, setWorkedWithTab] = useState<"artist" | "choreographer">("artist");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeIntent, setActiveIntent] = useState<SearchIntent | null>(null);
  const [dismissedClarifications, setDismissedClarifications] = useState<string[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [hasSearchResults, setHasSearchResults] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const workedWithMenuRef = useRef<HTMLDivElement>(null);

  const hasHistory = messages.length > 0;
  /** Overlay only after a chat has been sent (or while a reply is pending). */
  const chatSessionActive = hasHistory || isPending;
  const selectedOpenRole = openRoles.find((role) => role.id === selectedOpenRoleId) ?? null;
  const activeConnectionsCount =
    (filters.artists?.length ?? 0) + (filters.choreographers?.length ?? 0);
  const connectionsLabel =
    activeConnectionsCount === 0
      ? "Connections"
      : activeConnectionsCount === 1
        ? (filters.artists?.[0] ?? filters.choreographers?.[0] ?? "Connections")
        : `Connections (${activeConnectionsCount})`;

  const dismissLabel = hasSearchResults ? "Browse results" : "Close chat";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isPending, activeIntent]);

  useEffect(() => {
    onChatSessionChange?.(chatSessionActive);
  }, [chatSessionActive, onChatSessionChange]);

  useEffect(() => {
    if (!open || !sessionOverlayVisible) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (isTyping) return;
      event.preventDefault();
      onDismissChat();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, sessionOverlayVisible, onDismissChat]);

  useEffect(() => {
    if (!roleMenuOpen && !workedWithMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (roleMenuOpen && !roleMenuRef.current?.contains(target)) {
        setRoleMenuOpen(false);
      }
      if (workedWithMenuOpen && !workedWithMenuRef.current?.contains(target)) {
        setWorkedWithMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [roleMenuOpen, workedWithMenuOpen]);

  function applyResult(
    result: Awaited<ReturnType<typeof parseNlTalentQuery>>,
  ) {
    onFiltersChange(result.filters, true);
    if (!result.blockingClarification) {
      onTalentPoolChange?.(result.data.talent);
      setHasSearchResults(result.data.talent.length > 0);
    }

    if (result.intent) {
      setActiveIntent(result.intent);
    }
    setDegraded(Boolean(result.degraded));

    const ambiguousChoices =
      result.warnings
        ?.filter((w) => w.type === "ambiguous" && w.resolution?.candidates?.length)
        .map((w) => ({
          requestedName: w.resolution!.requestedName,
          role: w.resolution!.role as "artist" | "choreographer" | "production",
          candidates: w.resolution!.candidates!,
        })) ?? [];
    const hasAmbiguous = ambiguousChoices.length > 0 || Boolean(result.ambiguousProfiles?.length);
    const talentResults = toResultCards(result.data.talent);
    const emptyResults =
      !hasAmbiguous &&
      !result.blockingClarification &&
      talentResults.length === 0;

    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.reasoning.prose,
        intent: result.intent,
        talentResults:
          !hasAmbiguous && !result.blockingClarification && talentResults.length > 0
            ? talentResults
            : result.blockingClarification
              ? undefined
              : talentResults.length > 0
                ? talentResults
                : undefined,
        emptyResults: emptyResults || undefined,
        ambiguousChoices: ambiguousChoices.length ? ambiguousChoices : undefined,
        ambiguousProfiles: result.ambiguousProfiles,
        relaxationSuggestions: result.relaxationSuggestions,
        degraded: result.degraded,
      },
    ]);
  }

  function submitPrompt(event?: React.FormEvent, overridePrompt?: string) {
    event?.preventDefault();
    const prompt = (overridePrompt ?? input).trim();
    if (!prompt || isPending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
    };
    setMessages((current) => [...current, userMessage]);
    if (!overridePrompt) setInput("");
    setDismissedClarifications([]);

    startTransition(async () => {
      try {
        const result = await parseNlTalentQuery(prompt, filters);
        if (result.error && !result.intent) {
          setMessages((current) => [
            ...current,
            {
              id: `err-${Date.now()}`,
              role: "assistant",
              content: result.error ?? "Could not refine search.",
            },
          ]);
          return;
        }
        applyResult(result);
      } catch {
        setMessages((current) => [
          ...current,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "Search assistant unavailable. Try again in a moment.",
          },
        ]);
      }
    });
  }

  function selectWorkedWith(name: string, role: "artist" | "choreographer") {
    setWorkedWithMenuOpen(false);
    const prompt =
      role === "artist"
        ? `Find dancers who have worked with ${name}`
        : `Show me dancers who have worked with choreographer ${name}`;
    submitPrompt(undefined, prompt);
  }

  function chooseEntity(choice: {
    role: "artist" | "choreographer" | "production";
    entityId: string;
    entityName: string;
  }) {
    startTransition(async () => {
      const result = await resolveCreditEntityChoice({
        priorFilters: filters,
        role: choice.role,
        entityId: choice.entityId,
        entityName: choice.entityName,
      });
      applyResult(result);
    });
  }

  function chooseProfile(profileId: string, profileName: string) {
    if (!activeIntent) return;
    startTransition(async () => {
      const result = await resolveReferenceProfileChoice({
        priorFilters: filters,
        intent: activeIntent,
        profileId,
        profileName,
      });
      applyResult(result);
    });
  }

  function handleClarificationAnswer(questionId: string, optionIds: string[]) {
    if (!activeIntent) return;
    startTransition(async () => {
      const result = await applyNavigatorClarification({
        priorFilters: filters,
        intent: activeIntent,
        questionId,
        optionIds,
      });
      applyResult(result);
    });
  }

  function handleClarificationSkip(questionId: string) {
    setDismissedClarifications((current) => [...current, questionId]);
  }

  function handleRemoveToken(tokenId: string) {
    if (!activeIntent) return;
    startTransition(async () => {
      const result = await removeNavigatorBriefToken({
        priorFilters: filters,
        intent: activeIntent,
        tokenId,
      });
      applyResult(result);
    });
  }

  function handleRelaxation(relaxationId: string) {
    startTransition(async () => {
      const result = await applyNavigatorRelaxation({
        priorFilters: filters,
        intent: activeIntent ?? undefined,
        relaxationId,
      });
      applyResult(result);
    });
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitPrompt();
    }
  }

  const lastAssistantMessageId = [...messages].reverse().find((message) => message.role === "assistant")?.id;

  const messageList = (
    <div ref={listRef} className="talent-navigator__nl-messages">
      {messages.map((message) => (
        <div
          key={message.id}
          className={
            message.role === "user"
              ? "talent-navigator__nl-turn talent-navigator__nl-turn--user"
              : "talent-navigator__nl-turn talent-navigator__nl-turn--assistant"
          }
        >
          {message.role === "user" ? (
            <div className="talent-navigator__nl-bubble">{message.content}</div>
          ) : (
            <div className="talent-navigator__nl-assistant">
              {message.emptyResults ? (
                <p className="talent-navigator__nl-empty-results" aria-label="No matching talent">
                  No matches for this search.
                </p>
              ) : null}

              {message.content ? (
                <p className="talent-navigator__nl-response-prose">{message.content}</p>
              ) : null}

              {message.id === lastAssistantMessageId && message.intent ? (
                <InterpretedBrief
                  intent={message.intent}
                  degraded={message.degraded ?? degraded}
                  onRemoveToken={handleRemoveToken}
                  variant="inline"
                />
              ) : null}

              {message.id === lastAssistantMessageId &&
              activeIntent?.clarificationQuestions?.length ? (
                <ClarificationChips
                  questions={activeIntent.clarificationQuestions}
                  dismissedIds={dismissedClarifications}
                  onAnswer={handleClarificationAnswer}
                  onSkip={handleClarificationSkip}
                />
              ) : null}

              {message.talentResults?.length ? (
                <PortraitResultsStack
                  key={`stack-${message.id}`}
                  people={message.talentResults}
                  onOpenProfile={onOpenProfile}
                />
              ) : null}

              {message.relaxationSuggestions?.length ? (
                <div className="talent-navigator__nl-relax" aria-label="Relax search constraints">
                  {message.relaxationSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="talent-navigator__nl-relax-btn"
                      onClick={() => handleRelaxation(suggestion.id)}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {message.ambiguousProfiles?.map((group) => (
                <div key={`profile-${group.requestedName}`} className="mt-2 space-y-1.5">
                  <p className="text-xs text-white/55">
                    I found multiple Motiion profiles for &ldquo;{group.requestedName}&rdquo;. Which
                    one?
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.candidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        className="talent-navigator__nl-chip"
                        onClick={() => chooseProfile(candidate.id, candidate.name)}
                      >
                        {candidate.name}
                        {candidate.height ? ` · ${candidate.height}` : ""}
                        {candidate.location ? ` · ${candidate.location}` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {message.ambiguousChoices?.map((group) => (
                <div key={`${group.role}-${group.requestedName}`} className="mt-2 space-y-1.5">
                  <p className="text-xs text-white/55">
                    I found multiple matches for &ldquo;{group.requestedName}&rdquo;. Which one?
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.candidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        className="talent-navigator__nl-chip"
                        onClick={() =>
                          chooseEntity({
                            role: group.role,
                            entityId: candidate.id,
                            entityName: candidate.name,
                          })
                        }
                      >
                        {candidate.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {isPending ? (
        <div className="talent-navigator__nl-turn talent-navigator__nl-turn--assistant">
          <div className="talent-navigator__nl-pending">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            {activeIntent ? "Updating brief…" : "Understanding your brief…"}
          </div>
        </div>
      ) : null}
    </div>
  );

  const chipRow = (
    <div className="talent-navigator__nl-compose-meta">
      <div className="talent-navigator__nl-chips">
        <div className="talent-navigator__nl-chip-menu-wrap" ref={roleMenuRef}>
          <button
            type="button"
            className={`talent-navigator__nl-chip${selectedOpenRole ? " talent-navigator__nl-chip--active" : ""}`}
            onClick={() => {
              setWorkedWithMenuOpen(false);
              setRoleMenuOpen((open) => !open);
            }}
            aria-expanded={roleMenuOpen}
            aria-haspopup="listbox"
            aria-label={selectedOpenRole ? `Role: ${selectedOpenRole.name}` : "Select role"}
          >
            <Briefcase className="size-3" aria-hidden />
            <span className="talent-navigator__nl-chip-label">
              {selectedOpenRole ? selectedOpenRole.name : "Roles"}
            </span>
            <ChevronDown className="size-3 opacity-60" aria-hidden />
          </button>

          {roleMenuOpen ? (
            <div className="talent-navigator__nl-chip-menu" role="listbox" aria-label="Roles">
              <button
                type="button"
                className={`talent-navigator__nl-chip-menu-item${!selectedOpenRoleId ? " talent-navigator__nl-chip-menu-item--active" : ""}`}
                onClick={() => {
                  onOpenRoleChange("");
                  setRoleMenuOpen(false);
                }}
              >
                Any role
              </button>
              {openRoles.length ? (
                openRoles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    className={`talent-navigator__nl-chip-menu-item${selectedOpenRoleId === role.id ? " talent-navigator__nl-chip-menu-item--active" : ""}`}
                    onClick={() => {
                      onOpenRoleChange(role.id);
                      setRoleMenuOpen(false);
                    }}
                  >
                    <span className="talent-navigator__nl-chip-menu-title">{role.name}</span>
                    <span className="talent-navigator__nl-chip-menu-meta">
                      {role.projectTitle}
                      {role.castingTitle !== role.projectTitle ? ` · ${role.castingTitle}` : ""}
                    </span>
                  </button>
                ))
              ) : (
                <p className="talent-navigator__nl-chip-menu-empty">No open roles yet.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className="talent-navigator__nl-chip-menu-wrap" ref={workedWithMenuRef}>
          <button
            type="button"
            className={`talent-navigator__nl-chip${activeConnectionsCount > 0 ? " talent-navigator__nl-chip--active" : ""}`}
            onClick={() => {
              setRoleMenuOpen(false);
              setWorkedWithMenuOpen((open) => !open);
            }}
            aria-expanded={workedWithMenuOpen}
            aria-haspopup="dialog"
            aria-label="Connections"
          >
            <Users className="size-3" aria-hidden />
            <span className="talent-navigator__nl-chip-label">{connectionsLabel}</span>
            <ChevronDown className="size-3 opacity-60" aria-hidden />
          </button>

          {workedWithMenuOpen ? (
            <div className="talent-navigator__nl-chip-menu talent-navigator__nl-chip-menu--worked-with" role="dialog" aria-label="Connections">
              <div className="talent-navigator__worked-with-tabs" role="tablist" aria-label="Credit type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={workedWithTab === "artist"}
                  className={`talent-navigator__worked-with-tab${workedWithTab === "artist" ? " talent-navigator__worked-with-tab--active" : ""}`}
                  onClick={() => setWorkedWithTab("artist")}
                >
                  Artists
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={workedWithTab === "choreographer"}
                  className={`talent-navigator__worked-with-tab${workedWithTab === "choreographer" ? " talent-navigator__worked-with-tab--active" : ""}`}
                  onClick={() => setWorkedWithTab("choreographer")}
                >
                  Choreographers
                </button>
              </div>

              <div className="talent-navigator__worked-with-grid" role="listbox" aria-label={workedWithTab === "artist" ? "Artists" : "Choreographers"}>
                {(workedWithTab === "artist" ? WORKED_WITH_ARTISTS : WORKED_WITH_CHOREOGRAPHERS).map((name) => {
                  const selected =
                    workedWithTab === "artist"
                      ? (filters.artists ?? []).includes(name)
                      : (filters.choreographers ?? []).includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`talent-navigator__worked-with-tile${selected ? " talent-navigator__worked-with-tile--active" : ""}`}
                      onClick={() => selectWorkedWith(name, workedWithTab)}
                    >
                      <span className="talent-navigator__worked-with-tile-mark" aria-hidden>
                        {name.slice(0, 1)}
                      </span>
                      <span className="talent-navigator__worked-with-tile-name">{name}</span>
                    </button>
                  );
                })}
              </div>

              <p className="talent-navigator__nl-chip-menu-empty">
                Or type a name in search below.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className={`talent-navigator__nl-category-btn${
          filtersOpen ? " talent-navigator__nl-category-btn--active" : ""
        }`}
        onClick={onToggleFilters}
        aria-pressed={filtersOpen}
        aria-label={
          filtersOpen
            ? "Hide filters"
            : categoryLabel
              ? `Filters · ${categoryLabel}`
              : "Show filters"
        }
      >
        <ChevronsUpDown className="size-3.5" aria-hidden />
        <span className="talent-navigator__nl-category-btn-label">
          {categoryLabel ?? "Filters"}
        </span>
      </button>
    </div>
  );

  const composeForm = (
    <form className="talent-navigator__nl-compose" onSubmit={submitPrompt}>
      {chipRow}
      <TalentNlComposeBar
        input={input}
        isPending={isPending}
        onInputChange={setInput}
        onInputKeyDown={handleInputKeyDown}
        inputRef={inputRef}
        onVoiceUnavailable={() =>
          showToast({
            message: "Microphone access is unavailable in this browser.",
            variant: "error",
          })
        }
        onVoiceEmpty={() =>
          showToast({
            message: "No speech was detected. Try again and speak clearly.",
            variant: "error",
          })
        }
      />
    </form>
  );

  if (filtersOpen) {
    return null;
  }

  if (!composeVisible && !sessionOverlayVisible) {
    return null;
  }

  // Idle Discover: original navigator with compose bar only — no dim overlay.
  if (composeVisible && !sessionOverlayVisible) {
    return (
      <div
        className={`talent-navigator__chat-overlay talent-navigator__chat-overlay--idle${open ? " talent-navigator__chat-overlay--open" : ""}`}
        aria-hidden={!open}
      >
        <div className="talent-navigator__nl-compose-host">{composeForm}</div>
      </div>
    );
  }

  return (
    <div
      className={`talent-navigator__chat-overlay talent-navigator__chat-overlay--session${open ? " talent-navigator__chat-overlay--open" : ""}`}
      aria-hidden={!open}
    >
      <div className="talent-navigator__chat-backdrop" aria-hidden />

      <div
        ref={columnRef}
        className="talent-navigator__chat-focus-column"
        role="dialog"
        aria-modal="true"
        aria-label="Talent search assistant"
      >
        <header className="talent-navigator__chat-focus-header">
          <button
            type="button"
            className="talent-navigator__chat-dismiss"
            onClick={onDismissChat}
          >
            <X className="size-4" aria-hidden />
            {dismissLabel}
          </button>
        </header>

        <div className="talent-navigator__chat-focus-scroll">
          {messageList}
        </div>

        <div className="talent-navigator__chat-focus-compose">{composeForm}</div>
      </div>
    </div>
  );
}
