/** Soft quotas for free Industry accounts (when paywall enforcement is on). */

/** Max casting invites + referral asks a free user can send per casting. */
export const FREE_CASTING_OUTREACH_LIMIT = 5;

/** Total buyer file-inbox storage for free users (bytes). */
export const FREE_INBOX_STORAGE_BYTES = 100 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
