"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";

import {
  createAnonymousCastingReferral,
  searchTalentForReferralToken,
} from "@/app/(buyer-app)/projects/[id]/casting-workflow/actions";
import type { Talent } from "@/lib/talent-navigator/types";

import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import {
  formatReferralRoleSummary,
  type ReferralRoleOption,
} from "@/lib/talent-buyers/casting/referral-role-context";

export function AnonymousCastingReferralForm({
  token,
  castingTitle,
  castingDescription,
  roles,
}: {
  token: string;
  castingTitle: string;
  castingDescription?: string;
  roles: ReferralRoleOption[];
}) {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [referrerName, setReferrerName] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [results, setResults] = useState<Talent[]>([]);
  const [basket, setBasket] = useState<Talent[]>([]);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const basketIds = useMemo(() => new Set(basket.map((item) => item.id)), [basket]);

  async function runSearch() {
    const needle = query.trim();
    if (!needle) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const result = await searchTalentForReferralToken(token, needle);
      if (result.error) {
        showToast({ message: result.error, variant: "error" });
        setResults([]);
        return;
      }
      setResults(result.talent);
    } catch {
      showToast({ message: "Could not search talent.", variant: "error" });
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function addToBasket(talent: Talent) {
    if (basketIds.has(talent.id)) return;
    if (basket.length >= 10) {
      showToast({ message: "You can add up to 10 dancers.", variant: "error" });
      return;
    }
    setBasket((current) => [...current, talent]);
  }

  function removeFromBasket(talentId: string) {
    setBasket((current) => current.filter((item) => item.id !== talentId));
  }

  function submitBasket() {
    if (!basket.length) {
      showToast({ message: "Add at least one dancer to refer.", variant: "error" });
      return;
    }

    const selectedRole = roles.find((role) => role.id === roleId);
    const roleIds = selectedRole
      ? [...new Set([selectedRole.bridgedRoleId, selectedRole.id].filter(Boolean))]
      : [];

    startTransition(async () => {
      const result = await createAnonymousCastingReferral({
        token,
        referredProfileIds: basket.map((talent) => talent.id),
        roleIds: roleIds as string[],
        note,
        referrerDisplayName: referrerName,
      });

      if (!result.ok) {
        showToast({ message: result.error ?? "Referral failed", variant: "error" });
        return;
      }

      showToast({
        message: `Referred ${result.count ?? basket.length} dancer(s) to ${castingTitle}`,
        variant: "success",
      });
      setBasket([]);
      setResults([]);
      setQuery("");
      setSubmitted(true);
    });
  }

  const selectedRole = roles.find((role) => role.id === roleId) ?? roles[0];
  const selectedRoleSummary = selectedRole ? formatReferralRoleSummary(selectedRole) : "";

  if (submitted) {
    return (
      <div className="casting-refer-form">
        <header className="casting-refer-form__header">
          <h1>Thanks for referring</h1>
          <p>
            Your recommendations for <strong>{castingTitle}</strong> were submitted.
          </p>
        </header>
        <button type="button" className="bd-btn-secondary" onClick={() => setSubmitted(false)}>
          Refer more talent
        </button>
      </div>
    );
  }

  return (
    <div className="casting-refer-form">
      <header className="casting-refer-form__header">
        <h1>Refer talent</h1>
        <p>
          Recommend Motiion dancers for <strong>{castingTitle}</strong>. No account required.
        </p>
        {castingDescription?.trim() ? (
          <p className="casting-refer-form__description">{castingDescription.trim()}</p>
        ) : null}
      </header>

      <label className="casting-toolbar__field">
        <span>Your name (optional)</span>
        <input
          type="text"
          value={referrerName}
          onChange={(event) => setReferrerName(event.target.value)}
          className="casting-input"
          placeholder="So casting can see who referred"
        />
      </label>

      {roles.length > 0 ? (
        <div className="casting-refer-form__role-context">
          {roles.length > 1 ? (
            <label className="casting-toolbar__field">
              <span>Role</span>
              <select value={roleId} onChange={(event) => setRoleId(event.target.value)} className="casting-select">
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="casting-refer-form__role-name">{selectedRole?.name}</p>
          )}
          {selectedRole?.description?.trim() ? (
            <p className="casting-refer-form__role-description">{selectedRole.description.trim()}</p>
          ) : null}
          {selectedRoleSummary ? (
            <p className="casting-refer-form__role-summary">{selectedRoleSummary}</p>
          ) : null}
        </div>
      ) : null}

      <label className="casting-toolbar__field">
        <span>Note (optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="casting-input min-h-20 resize-y"
          placeholder="Why are these dancers a good fit?"
        />
      </label>

      <div className="casting-refer-form__search">
        <label className="casting-toolbar__field casting-find-talent-toolbar__search">
          <span>Find dancer</span>
          <div className="casting-find-talent-toolbar__search-input">
            <Search className="size-4 text-white/35" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void runSearch();
                }
              }}
              placeholder="Search by name, style, or location"
              className="casting-input"
            />
          </div>
        </label>
        <button type="button" className="bd-btn-secondary" onClick={() => void runSearch()} disabled={searching}>
          {searching ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Search"}
        </button>
      </div>

      <ul className="casting-refer-form__results">
        {results.map((talent) => (
          <li key={talent.id} className="casting-refer-form__result">
            <div className="casting-refer-form__result-main">
              {talent.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={talent.imageUrl} alt="" className="casting-refer-form__photo" />
              ) : (
                <div className="casting-refer-form__photo casting-refer-form__photo--empty" />
              )}
              <div>
                <strong>{talent.name}</strong>
                {talent.location ? <p>{talent.location}</p> : null}
              </div>
            </div>
            <button
              type="button"
              className="bd-btn-accent"
              disabled={basketIds.has(talent.id)}
              onClick={() => addToBasket(talent)}
            >
              {basketIds.has(talent.id) ? "Added" : "Add"}
            </button>
          </li>
        ))}
      </ul>

      {basket.length > 0 ? (
        <div className="casting-refer-form__basket">
          <h2>Referral list ({basket.length})</h2>
          <ul className="casting-refer-form__results">
            {basket.map((talent) => (
              <li key={talent.id} className="casting-refer-form__result">
                <div className="casting-refer-form__result-main">
                  <strong>{talent.name}</strong>
                </div>
                <button
                  type="button"
                  className="bd-btn-secondary inline-flex items-center gap-1"
                  onClick={() => removeFromBasket(talent.id)}
                  aria-label={`Remove ${talent.name}`}
                >
                  <X className="size-3.5" aria-hidden />
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="bd-btn-accent"
            disabled={isPending}
            onClick={submitBasket}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Submitting…
              </>
            ) : (
              `Submit ${basket.length} referral${basket.length === 1 ? "" : "s"}`
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
