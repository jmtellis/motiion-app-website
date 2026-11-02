export type CastingSubmissionDraft = { note: string; answers: Record<string, string>; slate: string; links: string };
export const EMPTY_CASTING_SUBMISSION_DRAFT: CastingSubmissionDraft = { note: "", answers: {}, slate: "", links: "" };

export function normalizeCastingSubmissionMaterials(input: { slate?: string; links?: string; slateRequired: boolean; maxLinks: number }) {
  const slate = input.slate?.trim() ?? "";
  const links = [...new Set((input.links ?? "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean))];
  if (input.slateRequired && !slate) return { ok: false as const, error: "Add the slate video link required for this role." };
  const isWebUrl = (value: string) => {
    try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password; }
    catch { return false; }
  };
  if (slate && !isWebUrl(slate)) return { ok: false as const, error: "Use a complete https:// link for your slate video." };
  if (links.length > input.maxLinks) return { ok: false as const, error: input.maxLinks > 0 ? `This role accepts up to ${input.maxLinks} work links.` : "This role does not accept additional work links." };
  if (links.some((url) => !isWebUrl(url))) return { ok: false as const, error: "Use complete https:// work links, one per line." };
  return { ok: true as const, slate: slate || null, links };
}

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
export function castingSubmissionDraftStorage(): DraftStorage {
  try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; }
}
const draftKey = (userId: string, roleId: string) => `motiion:casting-submission:v1:${userId}:${roleId}`;
export function readCastingSubmissionDraft(storage: DraftStorage, userId: string, roleId: string): CastingSubmissionDraft {
  try {
    const value = JSON.parse(storage?.getItem(draftKey(userId, roleId)) ?? "null");
    if (!value || typeof value !== "object") return EMPTY_CASTING_SUBMISSION_DRAFT;
    return {
      note: typeof value.note === "string" ? value.note : "",
      slate: typeof value.slate === "string" ? value.slate : "",
      links: typeof value.links === "string" ? value.links : "",
      answers: value.answers && typeof value.answers === "object" && !Array.isArray(value.answers)
        ? Object.fromEntries(Object.entries(value.answers).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {},
    };
  } catch { return EMPTY_CASTING_SUBMISSION_DRAFT; }
}
export function writeCastingSubmissionDraft(storage: DraftStorage, userId: string, roleId: string, draft: CastingSubmissionDraft) {
  try { storage?.setItem(draftKey(userId, roleId), JSON.stringify(draft)); } catch { /* The form remains usable when browser storage is unavailable. */ }
}
export function clearCastingSubmissionDraft(storage: DraftStorage, userId: string, roleId: string) {
  try { storage?.removeItem(draftKey(userId, roleId)); } catch { /* Submission success must not depend on browser storage. */ }
}
