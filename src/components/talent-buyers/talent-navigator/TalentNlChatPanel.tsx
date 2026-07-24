"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Briefcase, ChevronDown, ChevronsUpDown, Loader2, Users } from "lucide-react";

import {
  parseNlTalentQuery,
  resolveCreditEntityChoice,
} from "@/app/(buyer-app)/(paid)/talent/actions";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import { getProfileInitials } from "@/lib/auth/avatar";
import type { BuyerOpenRole } from "@/lib/talent-navigator/open-roles";
import type { Talent, TalentNavigatorFilters } from "@/lib/talent-navigator/types";

import { TalentNlComposeBar } from "./TalentNlComposeBar";

const RESULT_CHIP_LIMIT = 12;

type TalentResultChip = {
  id: string;
  name: string;
  imageUrl: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  bullets?: string[];
  talentResults?: TalentResultChip[];
  emptyResults?: boolean;
  ambiguousChoices?: Array<{
    requestedName: string;
    role: "artist" | "choreographer" | "production";
    candidates: Array<{ id: string; name: string; type: string; score: number }>;
  }>;
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
  /** Active category row label shown on the filters chip. */
  categoryLabel?: string;
  /** Right-side chat rail (Find Talent Discover mode). */
  open?: boolean;
};

function toResultChips(talent: Talent[]): TalentResultChip[] {
  return talent.slice(0, RESULT_CHIP_LIMIT).map((person) => ({
    id: person.id,
    name: person.name,
    imageUrl: person.imageUrl,
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

export function TalentNlChatPanel({
  filters,
  filtersOpen,
  onToggleFilters,
  openRoles,
  selectedOpenRoleId,
  onOpenRoleChange,
  onFiltersChange,
  onTalentPoolChange,
  categoryLabel,
  open = true,
}: TalentNlChatPanelProps) {
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [workedWithMenuOpen, setWorkedWithMenuOpen] = useState(false);
  const [workedWithTab, setWorkedWithTab] = useState<"artist" | "choreographer">("artist");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const workedWithMenuRef = useRef<HTMLDivElement>(null);

  const hasHistory = messages.length > 0;
  const selectedOpenRole = openRoles.find((role) => role.id === selectedOpenRoleId) ?? null;
  const activeConnectionsCount =
    (filters.artists?.length ?? 0) + (filters.choreographers?.length ?? 0);
  const connectionsLabel =
    activeConnectionsCount === 0
      ? "Connections"
      : activeConnectionsCount === 1
        ? (filters.artists?.[0] ?? filters.choreographers?.[0] ?? "Connections")
        : `Connections (${activeConnectionsCount})`;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isPending]);

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
    onTalentPoolChange?.(result.data.talent);

    const ambiguousChoices =
      result.warnings
        ?.filter((w) => w.type === "ambiguous" && w.resolution?.candidates?.length)
        .map((w) => ({
          requestedName: w.resolution!.requestedName,
          role: w.resolution!.role as "artist" | "choreographer" | "production",
          candidates: w.resolution!.candidates!,
        })) ?? [];
    const hasAmbiguous = ambiguousChoices.length > 0;
    const talentResults = toResultChips(result.data.talent);
    const emptyResults = !hasAmbiguous && talentResults.length === 0;

    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: hasAmbiguous ? result.reasoning.headline : "",
        bullets: hasAmbiguous ? result.reasoning.bullets : undefined,
        talentResults: !hasAmbiguous && talentResults.length > 0 ? talentResults : undefined,
        emptyResults: emptyResults || undefined,
        ambiguousChoices: hasAmbiguous ? ambiguousChoices : undefined,
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

    startTransition(async () => {
      try {
        const result = await parseNlTalentQuery(prompt, filters);
        if (result.error) {
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

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitPrompt();
    }
  }

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
                <div className="talent-navigator__nl-result-chips" aria-label="No matching talent">
                  <span className="talent-navigator__nl-result-chip talent-navigator__nl-result-chip--empty">
                    <span
                      className="talent-navigator__nl-result-chip-avatar talent-navigator__nl-result-chip-avatar--fallback"
                      aria-hidden
                    >
                      ?
                    </span>
                    <span className="talent-navigator__nl-result-chip-name">None</span>
                  </span>
                </div>
              ) : null}

              {message.talentResults?.length ? (
                <div
                  className="talent-navigator__nl-result-chips"
                  aria-label={`${message.talentResults.length} matching dancers`}
                >
                  {message.talentResults.map((person) => {
                    const initials = getProfileInitials(person.name);
                    return (
                      <span key={person.id} className="talent-navigator__nl-result-chip">
                        {person.imageUrl ? (
                          <img
                            src={person.imageUrl}
                            alt=""
                            className="talent-navigator__nl-result-chip-avatar"
                          />
                        ) : (
                          <span className="talent-navigator__nl-result-chip-avatar talent-navigator__nl-result-chip-avatar--fallback" aria-hidden>
                            {initials || "?"}
                          </span>
                        )}
                        <span className="talent-navigator__nl-result-chip-name">{person.name}</span>
                      </span>
                    );
                  })}
                </div>
              ) : null}

              {message.content ? <p>{message.content}</p> : null}
              {message.bullets?.length ? (
                <ul className="talent-navigator__nl-bullets">
                  {message.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
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
            Refining results…
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

  return (
    <div
      className={`talent-navigator__chat-overlay${open ? " talent-navigator__chat-overlay--open" : ""}`}
      aria-hidden={!open}
    >
      {hasHistory ? (
        <section className="talent-navigator__nl-rail talent-navigator__nl-rail--end" aria-label="Search history">
          {messageList}
        </section>
      ) : null}

      <div className="talent-navigator__nl-compose-host">{composeForm}</div>

      <div className="talent-navigator__nl-mobile">
        {hasHistory ? (
          <button
            type="button"
            className="talent-navigator__nl-mobile-toggle"
            onClick={() => setMobileHistoryOpen((current) => !current)}
            aria-expanded={mobileHistoryOpen}
            aria-controls="talent-navigator-nl-sheet"
          >
            {mobileHistoryOpen ? "Hide history" : "View search history"}
          </button>
        ) : null}

        {mobileHistoryOpen && hasHistory ? (
          <section
            id="talent-navigator-nl-sheet"
            className="talent-navigator__nl-sheet"
            aria-label="Search history"
          >
            {messageList}
          </section>
        ) : null}
      </div>
    </div>
  );
}
