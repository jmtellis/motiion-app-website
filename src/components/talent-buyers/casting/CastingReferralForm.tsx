"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";

import { createCastingReferral } from "@/app/(buyer-app)/projects/[id]/casting-workflow/actions";
import { fetchNavigatorTalent } from "@/app/(buyer-app)/talent/actions";
import {
  fetchReferrerDiscoverListMembers,
  fetchReferrerDiscoverLists,
  fetchReferrerFavorites,
  fetchReferrerFollowing,
  type ReferrerListSummary,
} from "@/lib/talent/referrer-lists";
import { EMPTY_NAVIGATOR_FILTERS } from "@/lib/talent-navigator/types";
import type { Talent } from "@/lib/talent-navigator/types";

import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import {
  formatReferralRoleSummary,
  type ReferralRoleOption,
} from "@/lib/talent-buyers/casting/referral-role-context";

type SourceTab = "search" | "favorites" | "following" | "lists";

export function CastingReferralForm({
  castingId,
  castingTitle,
  castingDescription,
  roles,
}: {
  castingId: string;
  castingTitle: string;
  castingDescription?: string;
  roles: ReferralRoleOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [tab, setTab] = useState<SourceTab>("search");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [results, setResults] = useState<Talent[]>([]);
  const [favorites, setFavorites] = useState<Talent[]>([]);
  const [following, setFollowing] = useState<Talent[]>([]);
  const [lists, setLists] = useState<ReferrerListSummary[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [listMembers, setListMembers] = useState<Talent[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingSource, setLoadingSource] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (tab !== "favorites") return;
    let cancelled = false;
    setLoadingSource(true);
    void fetchReferrerFavorites().then((result) => {
      if (cancelled) return;
      if (result.error) {
        showToast({ message: result.error, variant: "error" });
        setFavorites([]);
      } else {
        setFavorites(result.talent);
      }
      setLoadingSource(false);
    });
    return () => {
      cancelled = true;
    };
  }, [showToast, tab]);

  useEffect(() => {
    if (tab !== "following") return;
    let cancelled = false;
    setLoadingSource(true);
    void fetchReferrerFollowing().then((result) => {
      if (cancelled) return;
      if (result.error) {
        showToast({ message: result.error, variant: "error" });
        setFollowing([]);
      } else {
        setFollowing(result.talent);
      }
      setLoadingSource(false);
    });
    return () => {
      cancelled = true;
    };
  }, [showToast, tab]);

  useEffect(() => {
    if (tab !== "lists") return;
    let cancelled = false;
    setLoadingLists(true);
    void fetchReferrerDiscoverLists().then((result) => {
      if (cancelled) return;
      if (result.error) {
        showToast({ message: result.error, variant: "error" });
        setLists([]);
      } else {
        setLists(result.lists);
        setSelectedListId((current) => current || result.lists[0]?.id || "");
      }
      setLoadingLists(false);
    });
    return () => {
      cancelled = true;
    };
  }, [showToast, tab]);

  useEffect(() => {
    if (tab !== "lists" || !selectedListId) {
      setListMembers([]);
      return;
    }
    let cancelled = false;
    setLoadingSource(true);
    void fetchReferrerDiscoverListMembers(selectedListId).then((result) => {
      if (cancelled) return;
      if (result.error) {
        showToast({ message: result.error, variant: "error" });
        setListMembers([]);
      } else {
        setListMembers(result.talent);
      }
      setLoadingSource(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedListId, showToast, tab]);

  async function runSearch() {
    const needle = query.trim();
    if (!needle) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const data = await fetchNavigatorTalent({
        ...EMPTY_NAVIGATOR_FILTERS,
        keyword: needle,
      });
      setResults(data.talent.slice(0, 12));
    } catch {
      showToast({ message: "Could not search talent.", variant: "error" });
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function submitReferral(talent: Talent) {
    const selectedRole = roles.find((role) => role.id === roleId);
    const roleIds = selectedRole
      ? [...new Set([selectedRole.bridgedRoleId, selectedRole.id].filter(Boolean))]
      : [];

    startTransition(async () => {
      const result = await createCastingReferral({
        castingId,
        referredProfileId: talent.id,
        roleIds: roleIds as string[],
        note,
      });

      if (!result.ok) {
        showToast({ message: result.error ?? "Referral failed", variant: "error" });
        return;
      }

      showToast({ message: `${talent.name} referred to ${castingTitle}`, variant: "success" });
      router.refresh();
    });
  }

  const displayedTalent =
    tab === "search"
      ? results
      : tab === "favorites"
        ? favorites
        : tab === "following"
          ? following
          : listMembers;

  const tabs: { id: SourceTab; label: string }[] = [
    { id: "search", label: "Search" },
    { id: "favorites", label: "Favorites" },
    { id: "following", label: "Following" },
    { id: "lists", label: "My lists" },
  ];

  const selectedRole = roles.find((role) => role.id === roleId) ?? roles[0];
  const selectedRoleSummary = selectedRole ? formatReferralRoleSummary(selectedRole) : "";

  return (
    <div className="casting-refer-form">
      <header className="casting-refer-form__header">
        <h1>Refer talent</h1>
        <p>
          Recommend a Motiion dancer for <strong>{castingTitle}</strong>.
        </p>
        {castingDescription?.trim() ? (
          <p className="casting-refer-form__description">{castingDescription.trim()}</p>
        ) : null}
      </header>

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
          placeholder="Why is this dancer a good fit?"
        />
      </label>

      <div className="casting-refer-form__tabs" role="tablist" aria-label="Referral source">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`casting-refer-form__tab${tab === item.id ? " is-active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "search" ? (
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
      ) : null}

      {tab === "lists" ? (
        <label className="casting-toolbar__field">
          <span>List</span>
          <select
            value={selectedListId}
            onChange={(event) => setSelectedListId(event.target.value)}
            className="casting-select"
            disabled={loadingLists || lists.length === 0}
          >
            {lists.length === 0 ? <option value="">No lists yet</option> : null}
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.memberCount})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {loadingSource || (tab === "lists" && loadingLists) ? (
        <div className="casting-refer-form__loading">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span>Loading…</span>
        </div>
      ) : (
        <ul className="casting-refer-form__results">
          {displayedTalent.map((talent) => (
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
                disabled={isPending}
                onClick={() => submitReferral(talent)}
              >
                Refer
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loadingSource &&
      tab !== "search" &&
      displayedTalent.length === 0 &&
      !(tab === "lists" && lists.length === 0) ? (
        <p className="casting-refer-form__empty">No dancers in this list yet.</p>
      ) : null}

      {tab === "lists" && !loadingLists && lists.length === 0 ? (
        <p className="casting-refer-form__empty">
          Create custom lists in the Motiion app (My lists) to refer from them here.
        </p>
      ) : null}
    </div>
  );
}
