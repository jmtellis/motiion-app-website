/** Billed artist names from `activities.event_type_data`, matching iOS EventTourArtist.eyebrowText. */
export function billedArtistsEyebrow(
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!data || typeof data !== "object") return null;
  const project = Array.isArray(data.project_artists) ? data.project_artists : [];
  const tour = Array.isArray(data.artists) ? data.artists : [];
  const artists = project.length ? project : tour;
  const names = artists
    .map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const name = (entry as { name?: unknown }).name;
      return typeof name === "string" ? name.trim() : "";
    })
    .filter(Boolean);
  return names.length ? names.join(", ") : null;
}
