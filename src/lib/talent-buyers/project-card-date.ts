/** Calendar dates stay in their authored day, independent of the browser timezone. */
export function projectCardDate(start?: string | null, end?: string | null): string {
  const format = (value?: string | null) => {
    const key = value?.slice(0, 10);
    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
    const date = new Date(`${key}T12:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== key) return null;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
  };
  const first = format(start);
  const last = format(end);
  return first && last && first !== last ? `${first} – ${last}` : first ?? last ?? "Dates to be announced";
}
