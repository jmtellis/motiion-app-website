export function formatCastingScheduleDay(value: string): string {
  return value.replace(
    /\b(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g,
    (raw, day: string) => {
      const date = new Date(`${day}T12:00:00Z`);
      if (Number.isNaN(date.getTime())) return raw;
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    },
  );
}
