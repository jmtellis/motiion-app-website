"use client";

import { useCallback, useEffect, useState } from "react";

type Result<T> = { data: T; error?: string };
type Snapshot<T> = { scope: string; revision: number; data: T; error?: string; hasLoaded: boolean };

/** Client votes and links refresh without erasing successful data or crossing role scopes. */
export function useCastingClientResource<T>(
  projectId: string,
  roleIds: string[],
  empty: T,
  load: (roleIds: string[]) => Promise<Result<T>>,
) {
  const roleKey = [...new Set(roleIds)].sort().join("|");
  const scope = `${projectId}:${roleKey}`;
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot<T> | null>(null);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      let result: Result<T>;
      try {
        result = await load(roleKey ? roleKey.split("|") : []);
      } catch {
        result = { data: empty, error: "Could not refresh client review. Check your connection and retry." };
      }
      if (cancelled) return;
      setSnapshot((previous) => ({
        scope,
        revision,
        data: result.error && previous?.scope === scope ? previous.data : result.data,
        error: result.error,
        hasLoaded: !result.error || (previous?.scope === scope && previous.hasLoaded),
      }));
    }
    void run();
    return () => { cancelled = true; };
  }, [scope, roleKey, revision, load, empty]);

  useEffect(() => {
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("online", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("online", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  const current = snapshot?.scope === scope ? snapshot : null;
  return {
    data: current?.data ?? empty,
    error: current?.error,
    hasLoaded: current?.hasLoaded ?? false,
    loading: !current || current.revision !== revision,
    refresh,
  };
}
