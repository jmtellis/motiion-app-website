import type { UpcomingActivity } from "@/types/app";

function formatActivitySchedule(row: Pick<UpcomingActivity, "activity_date" | "start_time">) {
  const parts = [row.activity_date, row.start_time?.slice(0, 5)].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Schedule TBD";
}

export { formatActivitySchedule };
