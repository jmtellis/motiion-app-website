import { publicWebUrl } from "@/lib/links/external-url";

export type ApplicationQuestion = { id: string; prompt: string; required: boolean };
export function readCastingApplicationDraft(raw: string | null, userId: string, roleId: string): Record<string, string> {
  if (!raw) return {};
  try {
    const saved = JSON.parse(raw);
    if (saved?.userId !== userId || saved?.roleId !== roleId || !saved.fields || typeof saved.fields !== "object" || Array.isArray(saved.fields)) return {};
    return Object.fromEntries(Object.entries(saved.fields).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch { return {}; }
}
export function castingApplicationQuestions(configuration: unknown): ApplicationQuestion[] {
  if (!configuration || typeof configuration !== "object") return [];
  const questions = (configuration as { additional_submission_questions?: unknown }).additional_submission_questions;
  if (!Array.isArray(questions)) return [];
  return questions.flatMap((value, index) => {
    if (!value || typeof value !== "object" || typeof value.prompt !== "string" || !value.prompt.trim()) return [];
    return [{ id: typeof value.id_key === "string" && value.id_key.trim() ? value.id_key.trim() : `question-${index}`, prompt: value.prompt.trim(), required: value.requires_answer === true }];
  });
}

export function castingApplicationMaterials(form: FormData, requirements: { slateRequired: boolean; maxLinks: number; questions: ApplicationQuestion[] }) {
  const slateText = String(form.get("slate") ?? "").trim();
  const slate = slateText ? publicWebUrl(slateText) : null;
  if ((slateText && !slate) || (requirements.slateRequired && !slate)) throw new Error("Add a valid slate video link.");
  const values = String(form.get("links") ?? "").split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  if (values.length > requirements.maxLinks) throw new Error(`Add up to ${requirements.maxLinks} work links.`);
  const links = values.map(value => { const url = publicWebUrl(value); if (!url) throw new Error("Use valid website URLs for your work links."); return url; });
  const answers: Record<string, string> = {};
  for (const question of requirements.questions) {
    const answer = String(form.get(`question:${question.id}`) ?? "").trim();
    if (question.required && !answer) throw new Error(`Answer “${question.prompt}” before submitting.`);
    if (answer.length > 4000) throw new Error("Keep each additional answer under 4,000 characters.");
    if (answer) answers[question.id] = answer;
  }
  return { slate, links, answers };
}
