"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";

import {
  acceptExtractedCredit,
  deleteOwnTalentCredit,
  listOwnTalentCredits,
  rejectExtractedCredit,
  searchIndustryEntities,
  upsertOwnTalentCredit,
} from "@/app/(app)/portfolio/credit-actions";
import type { TalentCreditRecord } from "@/lib/talent-navigator/credit-management";
import { CREDIT_TYPES } from "@/lib/talent-navigator/credit-types";
import { VerificationBadge } from "@/components/talent/VerificationBadge";

type Draft = {
  id?: string;
  creditType: string;
  artistName: string;
  artistEntityId: string;
  choreographerName: string;
  choreographerEntityId: string;
  productionName: string;
  productionEntityId: string;
  role: string;
  creditYear: string;
  isPublic: boolean;
};

const EMPTY_DRAFT: Draft = {
  creditType: "music_video",
  artistName: "",
  artistEntityId: "",
  choreographerName: "",
  choreographerEntityId: "",
  productionName: "",
  productionEntityId: "",
  role: "",
  creditYear: "",
  isPublic: true,
};

export function TalentCreditsManager() {
  const [credits, setCredits] = useState<TalentCreditRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<
    Array<{ id: string; name: string; type: string }>
  >([]);
  const [suggestField, setSuggestField] = useState<"artist" | "choreographer" | "production" | null>(
    null,
  );

  function reload() {
    startTransition(async () => {
      const result = await listOwnTalentCredits();
      if (result.error) setError(result.error);
      else {
        setError(null);
        setCredits(result.credits);
      }
    });
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookupEntities(
    field: "artist" | "choreographer" | "production",
    query: string,
  ) {
    setSuggestField(field);
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const type =
      field === "artist" ? "artist" : field === "choreographer" ? "choreographer" : undefined;
    const result = await searchIndustryEntities({ query, entityType: type });
    setSuggestions(result.entities);
  }

  function openCreate() {
    setDraft(EMPTY_DRAFT);
    setEditorOpen(true);
  }

  function openEdit(credit: TalentCreditRecord) {
    setDraft({
      id: credit.id,
      creditType: credit.creditType,
      artistName: credit.artistName ?? "",
      artistEntityId: credit.artistEntityId ?? "",
      choreographerName: credit.choreographerName ?? "",
      choreographerEntityId: credit.choreographerEntityId ?? "",
      productionName: credit.productionName ?? "",
      productionEntityId: credit.productionEntityId ?? "",
      role: credit.role ?? "",
      creditYear: credit.creditYear ? String(credit.creditYear) : "",
      isPublic: credit.isPublic,
    });
    setEditorOpen(true);
  }

  function save() {
    startTransition(async () => {
      const result = await upsertOwnTalentCredit({
        id: draft.id,
        creditType: draft.creditType,
        artistEntityId: draft.artistEntityId || null,
        choreographerEntityId: draft.choreographerEntityId || null,
        productionEntityId: draft.productionEntityId || null,
        artistName: draft.artistName || undefined,
        choreographerName: draft.choreographerName || undefined,
        productionName: draft.productionName || undefined,
        role: draft.role || null,
        creditYear: draft.creditYear ? Number(draft.creditYear) : null,
        isPublic: draft.isPublic,
        isSearchable: draft.isPublic,
        sourceType: "manual",
        verificationStatus: "talent_reported",
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditorOpen(false);
      reload();
    });
  }

  const pendingReview = credits.filter((c) => c.verificationStatus === "ai_extracted");
  const published = credits.filter((c) => c.verificationStatus !== "ai_extracted");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-mono text-xs font-medium tracking-[0.08em] text-[#8a8a8a] uppercase">
            Searchable credits
          </h2>
          <p className="mt-1 text-sm text-[#8a8a8a]">
            Credits used by Talent Navigator for artist and choreographer search.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#262626] bg-[#1e1e1e] px-3 text-sm text-[#eaeaea]"
        >
          <Plus className="size-3.5" aria-hidden />
          Add credit
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {pendingReview.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-[#3a3020] bg-[#1a160e] p-3">
          <p className="text-sm font-medium text-[#f5d78e]">Pending resume suggestions</p>
          {pendingReview.map((credit) => (
            <div key={credit.id} className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-[#fafafa]">
                  {credit.productionName || credit.artistName || "Untitled credit"}
                </p>
                <p className="text-xs text-[#8a8a8a]">
                  {[credit.artistName, credit.choreographerName, credit.creditYear]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {credit.sourceText ? (
                  <p className="mt-1 text-xs text-[#6a6a6a]">Source: {credit.sourceText}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-full bg-[#2dd4bf]/20 px-3 py-1 text-xs text-[#2dd4bf]"
                  onClick={() =>
                    startTransition(async () => {
                      await acceptExtractedCredit(credit.id);
                      reload();
                    })
                  }
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[#333] px-3 py-1 text-xs text-[#aaa]"
                  onClick={() =>
                    startTransition(async () => {
                      await rejectExtractedCredit(credit.id);
                      reload();
                    })
                  }
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {isPending && !credits.length ? (
        <div className="flex items-center gap-2 text-sm text-[#8a8a8a]">
          <Loader2 className="size-3.5 animate-spin" /> Loading credits…
        </div>
      ) : null}

      <ul className="space-y-2">
        {published.map((credit) => (
          <li
            key={credit.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#262626] bg-[#141414] p-3"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-[#fafafa]">
                  {credit.productionName || credit.artistName || "Untitled credit"}
                </p>
                <VerificationBadge status={credit.verificationStatus} />
              </div>
              <p className="text-xs text-[#8a8a8a]">
                {[
                  credit.role,
                  credit.artistName ? `Artist: ${credit.artistName}` : null,
                  credit.choreographerName ? `Choreographer: ${credit.choreographerName}` : null,
                  credit.creditYear,
                  credit.isPublic ? "Public" : "Private",
                  credit.sourceLabel,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full border border-[#333] px-3 py-1 text-xs text-[#ccc]"
                onClick={() => openEdit(credit)}
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded-full border border-[#333] p-1.5 text-[#888]"
                aria-label="Delete credit"
                onClick={() =>
                  startTransition(async () => {
                    await deleteOwnTalentCredit(credit.id);
                    reload();
                  })
                }
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {!published.length && !isPending ? (
        <p className="text-sm text-[#6a6a6a]">No searchable credits yet. Add your first credit.</p>
      ) : null}

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-[#333] bg-[#121212] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#fafafa]">
                {draft.id ? "Edit credit" : "Add credit"}
              </h3>
              <button type="button" onClick={() => setEditorOpen(false)} aria-label="Close">
                <X className="size-4 text-[#888]" />
              </button>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="text-[#8a8a8a]">Credit type</span>
              <select
                className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-[#fafafa]"
                value={draft.creditType}
                onChange={(e) => setDraft((d) => ({ ...d, creditType: e.target.value }))}
              >
                {CREDIT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

            {(
              [
                ["artist", "Artist", "artistName", "artistEntityId"],
                ["choreographer", "Choreographer", "choreographerName", "choreographerEntityId"],
                ["production", "Production / project", "productionName", "productionEntityId"],
              ] as const
            ).map(([field, label, nameKey, idKey]) => (
              <label key={field} className="relative block space-y-1 text-sm">
                <span className="text-[#8a8a8a]">{label}</span>
                <input
                  className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-[#fafafa]"
                  value={draft[nameKey]}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDraft((d) => ({ ...d, [nameKey]: value, [idKey]: "" }));
                    void lookupEntities(field, value);
                  }}
                  placeholder={`Search or type ${label.toLowerCase()}`}
                />
                {suggestField === field && suggestions.length ? (
                  <ul className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-[#333] bg-[#1a1a1a]">
                    {suggestions.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm text-[#eaeaea] hover:bg-[#242424]"
                          onClick={() => {
                            setDraft((d) => ({
                              ...d,
                              [nameKey]: item.name,
                              [idKey]: item.id,
                            }));
                            setSuggestions([]);
                            setSuggestField(null);
                          }}
                        >
                          {item.name}
                          <span className="ml-2 text-xs text-[#666]">{item.type}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </label>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 text-sm">
                <span className="text-[#8a8a8a]">Role</span>
                <input
                  className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-[#fafafa]"
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-[#8a8a8a]">Year</span>
                <input
                  className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-[#fafafa]"
                  value={draft.creditYear}
                  onChange={(e) => setDraft((d) => ({ ...d, creditYear: e.target.value }))}
                  inputMode="numeric"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-[#ccc]">
              <input
                type="checkbox"
                checked={draft.isPublic}
                onChange={(e) => setDraft((d) => ({ ...d, isPublic: e.target.checked }))}
              />
              Public and searchable
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-[#333] px-4 py-2 text-sm text-[#aaa]"
                onClick={() => setEditorOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#06201c]"
                onClick={save}
                disabled={isPending}
              >
                Save credit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
