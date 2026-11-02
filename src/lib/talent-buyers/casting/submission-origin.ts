/** A visible/synthetic submission is not consent to disclose account contacts. */
export function isAccountAuthoredSubmission(row: { talent_id?: string | null; submitted_by?: string | null }): boolean {
  return Boolean(row.talent_id && row.submitted_by && row.submitted_by === row.talent_id);
}
