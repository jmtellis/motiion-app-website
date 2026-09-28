/** Date-only parsing avoids timezone shifts and rejects impossible calendar dates. */
export function getBirthDateAge(value: string, today = new Date()): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return -1;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return -1;
  return today.getFullYear() - y - (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d) ? 1 : 0);
}
export function birthDateError(value: string): string | null {
  if (!value) return "Enter your date of birth.";
  if (getBirthDateAge(value) < 0) return "Enter a valid date of birth.";
  return getBirthDateAge(value) < 18 ? "You must be at least 18 to join Motiion." : null;
}
