import { ScheduleHub } from "@/components/talent/ScheduleHub";
import { fetchTalentScheduleHub, type ScheduleCategoryId } from "@/lib/app/schedule";
import { requireTalentAccount } from "@/lib/auth/session";

const CATEGORIES = new Set<ScheduleCategoryId>([
  "classes",
  "sessions",
  "events",
  "submissions",
]);

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireTalentAccount();
  const params = await searchParams;
  const rawCategory = typeof params.category === "string" ? params.category : null;
  const activeCategory =
    rawCategory && CATEGORIES.has(rawCategory as ScheduleCategoryId)
      ? (rawCategory as ScheduleCategoryId)
      : null;

  const data = await fetchTalentScheduleHub(profile.id);

  return <ScheduleHub data={data} activeCategory={activeCategory} />;
}
