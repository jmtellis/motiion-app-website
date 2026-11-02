/** Keep every role available while showing one opportunity per project. */
export function groupOpportunityProjects<
  T extends { projectId: string; roleId: string },
>(cards: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const card of cards) {
    const key = card.projectId || card.roleId;
    groups.set(key, [...(groups.get(key) ?? []), card]);
  }
  return [...groups.values()];
}
