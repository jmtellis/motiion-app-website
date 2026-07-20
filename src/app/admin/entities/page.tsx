"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

import {
  adminAddAlias,
  adminCreateEntity,
  adminListPendingEntities,
  adminMergeEntities,
  adminSearchEntities,
  adminUpdateCreditVerification,
} from "@/app/admin/entities/actions";
import { ENTITY_TYPES, VERIFICATION_STATUSES } from "@/lib/talent-navigator/credit-types";

type EntityRow = {
  id: string;
  entity_type: string;
  canonical_name: string;
  is_verified?: boolean;
  is_pending?: boolean;
};

export default function AdminEntitiesPage() {
  const [query, setQuery] = useState("");
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [pending, setPending] = useState<EntityRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState("artist");
  const [aliasEntityId, setAliasEntityId] = useState("");
  const [aliasText, setAliasText] = useState("");
  const [keepId, setKeepId] = useState("");
  const [mergeId, setMergeId] = useState("");
  const [creditId, setCreditId] = useState("");
  const [creditStatus, setCreditStatus] = useState("industry_confirmed");

  function refresh(search = query) {
    startTransition(async () => {
      const [searchResult, pendingResult] = await Promise.all([
        adminSearchEntities(search),
        adminListPendingEntities(),
      ]);
      if (searchResult.error) setError(searchResult.error);
      else setEntities(searchResult.entities as EntityRow[]);
      if (pendingResult.error) setError(pendingResult.error);
      else setPending(pendingResult.entities as EntityRow[]);
    });
  }

  useEffect(() => {
    refresh("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-[#666]">Admin</p>
          <h1 className="text-2xl font-semibold text-[#fafafa]">Industry entities</h1>
          <p className="mt-1 text-sm text-[#888]">
            Manage canonical artists, choreographers, productions, and credit verification.
          </p>
        </div>
        <Link href="/admin/analytics" className="text-sm text-[#2dd4bf] hover:underline">
          Analytics
        </Link>
      </header>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <section className="space-y-3 rounded-2xl border border-[#262626] bg-[#121212] p-4">
        <h2 className="text-sm font-medium text-[#eaeaea]">Search entities</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm text-[#fafafa]"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Beyoncé, Sean Bankhead…"
          />
          <button
            type="button"
            className="rounded-lg bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#06201c]"
            onClick={() => refresh(query)}
            disabled={isPending}
          >
            Search
          </button>
        </div>
        <ul className="max-h-72 space-y-1 overflow-auto text-sm">
          {entities.map((entity) => (
            <li
              key={entity.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#222] px-3 py-2"
            >
              <span className="text-[#fafafa]">
                {entity.canonical_name}{" "}
                <span className="text-[#666]">
                  ({entity.entity_type}
                  {entity.is_pending ? ", pending" : ""}
                  {entity.is_verified ? ", verified" : ""})
                </span>
              </span>
              <code className="text-[10px] text-[#555]">{entity.id}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-[#262626] bg-[#121212] p-4">
          <h2 className="text-sm font-medium text-[#eaeaea]">Create entity</h2>
          <select
            className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm"
            value={createType}
            onChange={(e) => setCreateType(e.target.value)}
          >
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Canonical name"
          />
          <button
            type="button"
            className="rounded-lg bg-[#2dd4bf] px-4 py-2 text-sm font-medium text-[#06201c]"
            onClick={() =>
              startTransition(async () => {
                const result = await adminCreateEntity({
                  entityType: createType,
                  canonicalName: createName,
                  isVerified: true,
                });
                if (result.error) setError(result.error);
                else {
                  setCreateName("");
                  refresh();
                }
              })
            }
          >
            Create
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#262626] bg-[#121212] p-4">
          <h2 className="text-sm font-medium text-[#eaeaea]">Add alias</h2>
          <input
            className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm"
            value={aliasEntityId}
            onChange={(e) => setAliasEntityId(e.target.value)}
            placeholder="Entity UUID"
          />
          <input
            className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm"
            value={aliasText}
            onChange={(e) => setAliasText(e.target.value)}
            placeholder="Alias"
          />
          <button
            type="button"
            className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#eaeaea]"
            onClick={() =>
              startTransition(async () => {
                const result = await adminAddAlias({
                  entityId: aliasEntityId,
                  alias: aliasText,
                });
                if (result.error) setError(result.error);
                else {
                  setAliasText("");
                  refresh();
                }
              })
            }
          >
            Add alias
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#262626] bg-[#121212] p-4">
          <h2 className="text-sm font-medium text-[#eaeaea]">Merge entities</h2>
          <input
            className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm"
            value={keepId}
            onChange={(e) => setKeepId(e.target.value)}
            placeholder="Keep entity UUID"
          />
          <input
            className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm"
            value={mergeId}
            onChange={(e) => setMergeId(e.target.value)}
            placeholder="Merge (delete) entity UUID"
          />
          <button
            type="button"
            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300"
            onClick={() =>
              startTransition(async () => {
                const result = await adminMergeEntities({
                  keepEntityId: keepId,
                  mergeEntityId: mergeId,
                });
                if (result.error) setError(result.error);
                else refresh();
              })
            }
          >
            Merge
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#262626] bg-[#121212] p-4">
          <h2 className="text-sm font-medium text-[#eaeaea]">Set credit verification</h2>
          <input
            className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm"
            value={creditId}
            onChange={(e) => setCreditId(e.target.value)}
            placeholder="Credit UUID"
          />
          <select
            className="w-full rounded-lg border border-[#333] bg-[#1a1a1a] px-3 py-2 text-sm"
            value={creditStatus}
            onChange={(e) => setCreditStatus(e.target.value)}
          >
            {VERIFICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#eaeaea]"
            onClick={() =>
              startTransition(async () => {
                const result = await adminUpdateCreditVerification({
                  creditId,
                  verificationStatus: creditStatus,
                });
                if (result.error) setError(result.error);
              })
            }
          >
            Update verification
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[#262626] bg-[#121212] p-4">
        <h2 className="text-sm font-medium text-[#eaeaea]">Pending suggested entities</h2>
        <ul className="space-y-1 text-sm">
          {pending.length === 0 ? (
            <li className="text-[#666]">No pending entities.</li>
          ) : (
            pending.map((entity) => (
              <li key={entity.id} className="text-[#ccc]">
                {entity.canonical_name}{" "}
                <span className="text-[#666]">
                  ({entity.entity_type}) — {entity.id}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
