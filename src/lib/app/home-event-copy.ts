function clockLabel(time: string | null) {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** App event detail date, e.g. "Wednesday, August 19 · 7:00 PM". */
export function homeEventDateLabel(date: string | null, startTime: string | null) {
  if (!date) return "Date to be announced";
  const label = new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const time = clockLabel(startTime);
  return time ? `${label} · ${time}` : label;
}
