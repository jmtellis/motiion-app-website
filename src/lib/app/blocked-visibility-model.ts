export const BLOCKED_USERS_CHANGED_EVENT = "motiion:blocked-users-changed";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function normalizeBlockedUserIds(value: unknown): Set<string> {
  return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && UUID.test(id)).map(id => id.toLowerCase()) : []);
}
export function allowsUser(userId: string | null | undefined, blocked: ReadonlySet<string>): boolean {
  return !userId || !blocked.has(userId.toLowerCase());
}
export function blockedUserQuery(column: "id" | "user_id", blocked: ReadonlySet<string>): string {
  const ids = [...blocked].filter(id => UUID.test(id));
  return ids.length ? `&${column}=not.in.(${ids.join(",")})` : "";
}
