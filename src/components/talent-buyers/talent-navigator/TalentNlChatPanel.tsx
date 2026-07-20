"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Briefcase, ChevronDown, Filter, Loader2 } from "lucide-react";

import {
  parseNlTalentQuery,
  resolveCreditEntityChoice,
} from "@/app/(buyer-app)/(paid)/talent/actions";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import type { BuyerOpenRole } from "@/lib/talent-navigator/open-roles";
import type { TalentNavigatorFilters } from "@/lib/talent-navigator/types";

import { TalentNlComposeBar } from "./TalentNlComposeBar";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  bullets?: string[];
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
  onTalentPoolChange?: (talent: import("@/lib/talent-navigator/types").Talent[]) => void;
};

const SUGGESTED_PROMPTS = [
  { label: "Worked with an artist", prompt: "Find dancers who have worked with Beyoncé" },
  { label: "Worked with a choreographer", prompt: "Show me dancers who have worked with Sean Bankhead" },
  { label: "Tour experience", prompt: "Who danced on the Renaissance World Tour?" },
  { label: "Verified credits only", prompt: "Show only dancers with industry-confirmed credits" },
  { label: "Available in Los Angeles", prompt: "Find LA-based dancers who are available" },
  { label: "Worked with both", prompt: "Find dancers who have worked with both Beyoncé and Sean Bankhead" },
];

export function TalentNlChatPanel({
  filters,
  filtersOpen,
  onToggleFilters,
  openRoles,
  selectedOpenRoleId,
  onOpenRoleChange,
  onFiltersChange,
  onTalentPoolChange,
}: TalentNlChatPanelProps) {
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  const hasHistory = messages.length > 0;
  const selectedOpenRole = openRoles.find((role) => role.id === selectedOpenRoleId) ?? null;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isPending]);

  useEffect(() => {
    if (!roleMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!roleMenuRef.current?.contains(event.target as Node)) {
        setRoleMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [roleMenuOpen]);

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

    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.reasoning.headline,
        bullets: result.reasoning.bullets,
        ambiguousChoices: ambiguousChoices.length ? ambiguousChoices : undefined,
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
              <p>{message.content}</p>
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
    <div className="talent-navigator__nl-chips">
      <button
        type="button"
        className={`talent-navigator__nl-chip${filtersOpen ? " talent-navigator__nl-chip--active" : ""}`}
        onClick={onToggleFilters}
        aria-pressed={filtersOpen}
        aria-label={filtersOpen ? "Hide filters" : "Show filters"}
      >
        <Filter className="size-3" aria-hidden />
        Filters
      </button>

      <div className="talent-navigator__nl-chip-menu-wrap" ref={roleMenuRef}>
        <button
          type="button"
          className={`talent-navigator__nl-chip${selectedOpenRole ? " talent-navigator__nl-chip--active" : ""}`}
          onClick={() => setRoleMenuOpen((open) => !open)}
          aria-expanded={roleMenuOpen}
          aria-haspopup="listbox"
          aria-label={selectedOpenRole ? `Role: ${selectedOpenRole.name}` : "Select open role"}
        >
          <Briefcase className="size-3" aria-hidden />
          <span className="talent-navigator__nl-chip-label">
            {selectedOpenRole ? selectedOpenRole.name : "Open role"}
          </span>
          <ChevronDown className="size-3 opacity-60" aria-hidden />
        </button>

        {roleMenuOpen ? (
          <div className="talent-navigator__nl-chip-menu" role="listbox" aria-label="Open roles">
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

      {!hasHistory
        ? SUGGESTED_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="talent-navigator__nl-chip"
              onClick={() => submitPrompt(undefined, item.prompt)}
            >
              {item.label}
            </button>
          ))
        : null}
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

  return (
    <>
      {hasHistory ? (
        <section className="talent-navigator__nl-rail" aria-label="Search history">
          {messageList}
        </section>
      ) : null}

      <div className="talent-navigator__nl-compose-host">{composeForm}</div>

      <div className="talent-navigator__nl-mobile">
        {hasHistory ? (
          <button
            type="button"
            className="talent-navigator__nl-mobile-toggle"
            onClick={() => setMobileHistoryOpen((open) => !open)}
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
    </>
  );
}
