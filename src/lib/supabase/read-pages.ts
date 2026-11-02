/** Read PostgREST pages without silently accepting its default 1,000-row cap.
 * Callers provide a stable order (including an ID tie-breaker). Failure never
 * becomes an empty success or a partially populated collection. */
export async function readPagedRows<T>(
  load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  { pageSize = 250, maxRows = 10000 }: { pageSize?: number; maxRows?: number } = {},
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  if (pageSize < 1 || maxRows < pageSize) throw new Error("Invalid page limits");
  const rows: T[] = [];
  try {
    for (let from = 0; from < maxRows; from += pageSize) {
      const result = await load(from, Math.min(from + pageSize - 1, maxRows - 1));
      if (result.error) return { data: null, error: result.error };
      const page = result.data ?? [];
      rows.push(...page);
      if (page.length < pageSize) return { data: rows, error: null };
    }
    const probe = await load(maxRows, maxRows);
    if (probe.error) return { data: null, error: probe.error };
    if (probe.data?.length) return { data: null, error: { message: "This collection is too large to load at once. Narrow the collection and try again." } };
    return { data: rows, error: null };
  } catch {
    return { data: null, error: { message: "The connection was interrupted. Please try again." } };
  }
}
