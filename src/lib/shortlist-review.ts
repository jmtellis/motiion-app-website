import type { PublicShortlistSubmission } from "@/types/publicShortlist";

export function shortlistInstagramUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const input = value.trim();
  if (/^@?[a-zA-Z0-9._]{1,30}$/.test(input)) return `https://www.instagram.com/${input.replace(/^@/, "")}/`;
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase()) || url.username || url.password) return null;
    url.protocol = "https:";
    return url.href;
  } catch { return null; }
}

export function groupShortlistByRole(submissions: PublicShortlistSubmission[], fallback: string) {
  const groups = new Map<string, { id: string; title: string; submissions: PublicShortlistSubmission[] }>();
  for (const submission of submissions) {
    const id = submission.roleId || "legacy-role";
    if (!groups.has(id)) groups.set(id, { id, title: submission.roleTitle || fallback, submissions: [] });
    groups.get(id)!.submissions.push(submission);
  }
  return [...groups.values()];
}
