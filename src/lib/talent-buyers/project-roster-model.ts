/** Canonical participants take precedence over old saved-list entries, including
 * removed participants: removing someone must not resurrect an old list entry. */
export function mergeProjectPeople<T extends { userId: string | null; profileId: string }>(
  participants: (T & { removed: boolean })[], legacy: T[],
): T[] {
  const seenUsers = new Set(participants.map((person) => person.userId).filter(Boolean));
  const seenProfiles = new Set(participants.map((person) => person.profileId));
  const result: T[] = participants.filter((person) => !person.removed);
  for (const person of legacy) {
    if (seenProfiles.has(person.profileId) || (person.userId && seenUsers.has(person.userId))) continue;
    result.push(person); seenProfiles.add(person.profileId);
    if (person.userId) seenUsers.add(person.userId);
  }
  return result;
}
