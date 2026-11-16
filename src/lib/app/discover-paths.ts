/** Client-safe Discover detail URL helpers (no server-only imports). */

/** Safe in-app back target for Discover detail pages. */
export function resolveDiscoverBackHref(from: string | undefined, basePath: "/discover" | "/talent") {
  if (from === "home") return "/home";
  if (from === "talent") return "/talent";
  if (from === "discover") return "/discover";
  if (from?.startsWith("/") && !from.startsWith("//") && !from.includes("://")) return from;
  return basePath;
}

export function discoverDetailHref(
  basePath: "/discover" | "/talent",
  kind: "collection" | "event" | "classes" | "profile",
  id?: string,
  from?: string,
) {
  const path =
    kind === "classes"
      ? `${basePath}/classes`
      : `${basePath}/${kind}/${encodeURIComponent(id ?? "")}`;
  if (!from) return path;
  const params = new URLSearchParams({ from });
  return `${path}?${params}`;
}

/** Carry only the selected ID with the existing filters when returning to Discover. */
export function discoverReturnHref(path: string, query: string, talentId: string) {
  const params = new URLSearchParams(query);
  params.set("focus", talentId);
  return `${path}?${params}`;
}
