"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { BriefToken, SearchIntent } from "@/lib/talent-navigator/search-intent";

const KIND_LABEL: Record<BriefToken["kind"], string> = {
  explicit: "explicit",
  inferred: "interpreted",
  default: "default",
  verified: "verified evidence",
  excluded: "excluded",
};

type InterpretedBriefProps = {
  intent: SearchIntent;
  degraded?: boolean;
  onRemoveToken?: (tokenId: string) => void;
  variant?: "default" | "inline";
  defaultExpanded?: boolean;
};

function buildBriefSummary(intent: SearchIntent): string {
  const looking = intent.briefTokens
    .filter((token) => token.section === "looking_for")
    .map((token) => token.label);
  const prioritizing = intent.briefTokens.filter((token) => token.section === "prioritizing");
  const assumptions = intent.briefTokens.filter((token) => token.section === "assumptions");

  if (!looking.length && !prioritizing.length && !assumptions.length) {
    return "How I interpreted your search";
  }

  const parts: string[] = [];

  if (looking.length) {
    parts.push(
      looking.length <= 3
        ? looking.join(", ")
        : `${looking.slice(0, 2).join(", ")}, and ${looking.length - 2} more`,
    );
  }

  if (prioritizing.length) {
    const labels = prioritizing.map((token) => token.label);
    parts.push(
      `prioritizing ${labels.length <= 2 ? labels.join(" and ") : `${labels.slice(0, 2).join(", ")}, and more`}`,
    );
  }

  if (assumptions.length) {
    parts.push(`${assumptions.length} assumption${assumptions.length === 1 ? "" : "s"}`);
  }

  return parts.join(" · ");
}

function TokenList({
  title,
  tokens,
  onRemoveToken,
}: {
  title: string;
  tokens: BriefToken[];
  onRemoveToken?: (tokenId: string) => void;
}) {
  if (!tokens.length) return null;
  return (
    <div className="talent-navigator__brief-section">
      <p className="talent-navigator__brief-section-label">{title}</p>
      <ul className="talent-navigator__brief-tokens">
        {tokens.map((token) => (
          <li key={token.id} className={`talent-navigator__brief-token talent-navigator__brief-token--${token.kind}`}>
            <span className="talent-navigator__brief-token-label">{token.label}</span>
            <span className="talent-navigator__brief-token-kind">{KIND_LABEL[token.kind]}</span>
            {token.removable && onRemoveToken ? (
              <button
                type="button"
                className="talent-navigator__brief-token-remove"
                aria-label={`Remove ${token.label}`}
                onClick={() => onRemoveToken(token.id)}
              >
                ×
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InterpretedBrief({
  intent,
  degraded,
  onRemoveToken,
  variant = "default",
  defaultExpanded = false,
}: InterpretedBriefProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const looking = intent.briefTokens.filter((token) => token.section === "looking_for");
  const prioritizing = intent.briefTokens.filter((token) => token.section === "prioritizing");
  const assumptions = intent.briefTokens.filter((token) => token.section === "assumptions");
  const summary = buildBriefSummary(intent);
  const isInline = variant === "inline";

  if (!looking.length && !prioritizing.length && !assumptions.length) {
    return null;
  }

  return (
    <section
      className={`talent-navigator__brief${isInline ? " talent-navigator__brief--inline" : ""}${expanded ? " talent-navigator__brief--expanded" : ""}`}
      aria-label="Interpreted brief"
    >
      <button
        type="button"
        className="talent-navigator__brief-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        <span className="talent-navigator__brief-toggle-copy">
          <span className="talent-navigator__brief-title">
            {isInline ? "How I read your brief" : "Interpreted brief"}
          </span>
          <span className="talent-navigator__brief-summary">{summary}</span>
        </span>
        <ChevronDown className="talent-navigator__brief-chevron" aria-hidden />
      </button>

      {expanded ? (
        <div className="talent-navigator__brief-details">
          {intent.originalQuery ? (
            <p className="talent-navigator__brief-query" title={intent.originalQuery}>
              &ldquo;{intent.originalQuery}&rdquo;
            </p>
          ) : null}
          {degraded ? (
            <p className="talent-navigator__brief-degraded" role="status">
              Structured search active — AI parsing unavailable.
            </p>
          ) : null}
          <TokenList title="Looking for" tokens={looking} onRemoveToken={onRemoveToken} />
          <TokenList title="Prioritizing" tokens={prioritizing} onRemoveToken={onRemoveToken} />
          <TokenList title="Assumptions" tokens={assumptions} onRemoveToken={onRemoveToken} />
        </div>
      ) : null}
    </section>
  );
}
