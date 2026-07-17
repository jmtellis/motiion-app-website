export type CollectionShareDuration = "two_hours" | "twenty_four_hours" | "one_week" | "never";

export type CollectionShareRecipient = {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export type CollectionShareSummary = {
  id: string;
  listId: string;
  listName: string;
  token: string;
  title: string | null;
  isActive: boolean;
  expiresAt: string | null;
  expirationKind: string | null;
  createdAt: string;
  publicUrl: string;
  recipients: CollectionShareRecipient[];
};

export const COLLECTION_SHARE_DURATIONS: { value: CollectionShareDuration; label: string }[] = [
  { value: "two_hours", label: "2 hours" },
  { value: "twenty_four_hours", label: "24 hours" },
  { value: "one_week", label: "1 week" },
  { value: "never", label: "No expiry" },
];

export function collectionShareDurationLabel(kind: string | null, expiresAt: string | null) {
  const match = COLLECTION_SHARE_DURATIONS.find((option) => option.value === kind);
  if (match) return match.label;
  if (!expiresAt) return "No expiry";
  return `Until ${new Date(expiresAt).toLocaleDateString()}`;
}

export function collectionShareExpiresAt(duration: CollectionShareDuration): string | null {
  const now = Date.now();
  switch (duration) {
    case "two_hours":
      return new Date(now + 2 * 60 * 60 * 1000).toISOString();
    case "twenty_four_hours":
      return new Date(now + 24 * 60 * 60 * 1000).toISOString();
    case "one_week":
      return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    case "never":
      return null;
    default:
      return null;
  }
}

export function publicCollectionShareUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.motiion.app";
  return `${base.replace(/\/$/, "")}/shared/collection/${token}`;
}
