import { parseResumeExperienceCategory } from "./resume-experience";

export type ImportedPortfolioCredit = {
  title: string; role?: string; credits?: string; category?: string;
  start_date?: string; end_date?: string; notes?: string;
};

function normalized(value: unknown) { return typeof value === "string" ? value.trim().toLocaleLowerCase().replace(/\s+/g, " ") : ""; }
function identity(row: Record<string, unknown>) {
  const roles = Array.isArray(row.roles) ? row.roles.map(normalized).filter(Boolean).sort().join("|") : normalized(row.role);
  return JSON.stringify([normalized(row.title), roles, normalized(row.start_date), normalized(row.end_date)]);
}

/** Import appends unique credits, preserving existing IDs, unknown/native fields and order. */
export function mergePortfolioCredits(current: Record<string, unknown>[], incoming: ImportedPortfolioCredit[], resumeUrl: string, createId: () => string = () => crypto.randomUUID()) {
  const seen = new Set(current.map(identity));
  const added = incoming.flatMap((item) => {
    const key = identity(item);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...item, id: createId(), category: parseResumeExperienceCategory(item.category) ?? "televisionFilm", roles: item.role ? [item.role] : undefined, source: "resume_import", source_document_url: resumeUrl }];
  });
  return { experiences: [...current, ...added], added: added.length };
}
