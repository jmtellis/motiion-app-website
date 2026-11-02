import { redirect } from "next/navigation";
export default async function LegacyAnalyticsDetail({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const days = range === "7d" ? "7" : range === "90d" ? "90" : "30";
  redirect(`/admin/analytics?view=engagement&range=${days}`);
}
