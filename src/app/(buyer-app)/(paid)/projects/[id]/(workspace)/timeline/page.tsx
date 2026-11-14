import { notFound } from "next/navigation";
import { ProjectSchedulePanel } from "@/components/talent-buyers/project/ProjectSchedulePanel";
import { requireHiringAccount } from "@/lib/auth/session";
import { fetchAccessibleProjectRecord } from "@/lib/talent-buyers/projects";
import { fetchScheduleBundle } from "@/lib/talent-buyers/schedule-markers-server";

export default async function ProjectTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireHiringAccount();
  const { id } = await params;
  if (!await fetchAccessibleProjectRecord(id, profile.id)) notFound();
  const { markers, error } = await fetchScheduleBundle(profile.id, id);
  return <ProjectSchedulePanel markers={markers} error={error} />;
}
