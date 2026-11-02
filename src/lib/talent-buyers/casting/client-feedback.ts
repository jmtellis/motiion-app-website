export type ClientFeedbackRow = {
  id: string;
  recipient_id: string;
  submission_id: string;
  vote: string;
  updated_at: string;
  submission: { role_id: string; talent?: { full_name?: string | null } | null };
  reviewer?: { display_name?: string | null } | null;
};

export type ClientReviewFeedback = {
  reviewerId: string;
  reviewerName: string;
  submittedAt: string;
  choices: { submissionId: string; roleId: string; name: string; selected: boolean }[];
};

/** Link access may end; a client's submitted decisions remain part of casting history. */
export function groupClientFeedback(rows: ClientFeedbackRow[], roleIds: string[]): ClientReviewFeedback[] {
  const roles = new Set(roleIds);
  const latest = new Map<string, ClientFeedbackRow>();
  for (const row of rows) {
    if (!roles.has(row.submission?.role_id) || !["yes", "no"].includes(row.vote)) continue;
    if (!row.recipient_id || !row.submission_id || !Number.isFinite(Date.parse(row.updated_at))) continue;
    const key = `${row.recipient_id}:${row.submission_id}`;
    const previous = latest.get(key);
    if (!previous || Date.parse(row.updated_at) > Date.parse(previous.updated_at)) latest.set(key, row);
  }
  const groups = new Map<string, ClientReviewFeedback>();
  for (const row of latest.values()) {
    let group = groups.get(row.recipient_id);
    if (!group) {
      group = { reviewerId: row.recipient_id, reviewerName: row.reviewer?.display_name?.trim() || "Reviewer", submittedAt: row.updated_at, choices: [] };
      groups.set(row.recipient_id, group);
    } else if (Date.parse(row.updated_at) > Date.parse(group.submittedAt)) {
      group.submittedAt = row.updated_at;
      group.reviewerName = row.reviewer?.display_name?.trim() || "Reviewer";
    }
    group.choices.push({ submissionId: row.submission_id, roleId: row.submission.role_id,
      name: row.submission.talent?.full_name?.trim() || "Unavailable profile", selected: row.vote === "yes" });
  }
  return [...groups.values()].map((group) => ({ ...group, choices: group.choices.sort((a, b) =>
    Number(b.selected) - Number(a.selected) || a.name.localeCompare(b.name, undefined, { numeric: true }) || a.submissionId.localeCompare(b.submissionId))
  })).sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt) || a.reviewerId.localeCompare(b.reviewerId));
}

export function tallyClientFeedback(reviews: ClientReviewFeedback[]) {
  const result: Record<string, { submissionId: string; yesCount: number; noCount: number }> = {};
  for (const review of reviews) for (const choice of review.choices) {
    const tally = result[choice.submissionId] ??= { submissionId: choice.submissionId, yesCount: 0, noCount: 0 };
    if (choice.selected) tally.yesCount += 1;
    else tally.noCount += 1;
  }
  return result;
}
