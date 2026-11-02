export type RosterShareDuration = "oneDay" | "oneWeek" | "thirtyDays" | "indefinite";
export const ROSTER_SHARE_DURATIONS: { value: RosterShareDuration; label: string }[] = [
  { value: "oneDay", label: "24 hours" }, { value: "oneWeek", label: "7 days" }, { value: "thirtyDays", label: "30 days" }, { value: "indefinite", label: "Until removed" },
];
export function rosterShareExpiry(duration: RosterShareDuration, now = new Date()) {
  if (duration === "indefinite") return null;
  const days = { oneDay: 1, oneWeek: 7, thirtyDays: 30 }[duration];
  if (!days || !Number.isFinite(now.getTime())) throw new Error("Choose a valid duration.");
  return new Date(now.getTime() + days * 86_400_000).toISOString();
}
export function extendsRosterAccess(previous: string | null, next: string | null) {
  if (previous === null) return false;
  return next === null || new Date(next).getTime() > new Date(previous).getTime();
}
export function rosterShareIsActive(expiresAt: string | null, now = new Date()) {
  return expiresAt === null || new Date(expiresAt).getTime() > now.getTime();
}
