const COMMON_SINGLE_TOKENS = new Set([
  "alex", "alexis", "anna", "anne", "ashley", "ava", "ben", "chris", "christian",
  "daniel", "david", "emily", "emma", "james", "jamie", "jay", "jess", "jessica",
  "john", "jordan", "josh", "justin", "kate", "katherine", "lauren", "lily", "lisa",
  "liz", "maria", "mark", "matt", "matthew", "maya", "megan", "mia", "michael",
  "mike", "morgan", "nick", "nicole", "olivia", "ryan", "sam", "samantha", "sarah",
  "sophia", "taylor", "tom", "tony", "tyler", "will",
]);

export function normalizeCreditName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** "worked with Sabrina Carpenter" → "Sabrina Carpenter". */
export function explicitWorkedWith(query: string): string | null {
  const match = /^(?:worked with:?)\s+(.+)$/i.exec(query.trim());
  const name = match?.[1]?.trim() ?? "";
  return name.length >= 2 ? name : null;
}

/**
 * A bare query becomes a credit filter only when the catalog has one strong match.
 * Short or common single tokens stay as people search until the user picks a suggestion.
 */
export function pickCreditRewrite(query: string, collaborators: string[]): string | null {
  const explicit = explicitWorkedWith(query);
  if (explicit) return explicit;

  const normalized = normalizeCreditName(query);
  if (normalized.length < 2) return null;

  const tokens = normalized.split(" ");
  if (tokens.length === 1 && (normalized.length < 6 || COMMON_SINGLE_TOKENS.has(normalized))) {
    return null;
  }

  const exact = collaborators.filter((name) => normalizeCreditName(name) === normalized);
  if (exact.length === 1) return exact[0];

  if (tokens.length >= 2) {
    const prefixed = collaborators.filter((name) => normalizeCreditName(name).startsWith(normalized));
    if (prefixed.length === 1) return prefixed[0];
  }

  return null;
}
