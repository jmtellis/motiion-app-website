export type CastingMediaKind = "headshot" | "headshotOriginal" | "resume";
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function isOwnedCastingMediaPath(path: string, userId: string, kind: CastingMediaKind) {
  const suffix = kind === "resume" ? `casting-resume-${uuid}\\.pdf`
    : kind === "headshot" ? `casting-headshot-${uuid}\\.jpg`
      : `casting-headshot-${uuid}-source\\.(jpg|png|webp)`;
  return path.startsWith(`${userId.toLowerCase()}/`) && new RegExp(`^${uuid}/${suffix}$`).test(path);
}

export function castingMediaError(kind: CastingMediaKind, size?: number, contentType?: string) {
  const resume = kind === "resume";
  const types = resume ? ["application/pdf"] : kind === "headshot" ? ["image/jpeg"] : ["image/jpeg", "image/png", "image/webp"];
  if (!size || size > (resume ? 8 : 6) * 1024 * 1024 || !types.includes(contentType ?? "")) {
    return resume ? "Upload a PDF résumé under 8 MB." : "Choose a JPEG, PNG or WebP headshot under 6 MB.";
  }
  return null;
}

/** Repeating a submitted form must not duplicate a headshot or detach its original. */
export function prependCastingHeadshot(headshots: string[], originals: string[], display: string, original: string) {
  const pairs = [{ display, original }, ...headshots.map((url, index) => ({ display: url, original: originals[index] || url }))];
  const seen = new Set<string>();
  const unique = pairs.filter(pair => { if (seen.has(pair.display)) return false; seen.add(pair.display); return true; }).slice(0, 4);
  return { headshots: unique.map(pair => pair.display), originals: unique.map(pair => pair.original) };
}
