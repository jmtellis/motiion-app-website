import { notFound } from "next/navigation";

import EventProgramPageClient from "@/app/event/[id]/program/event-program-page-client";
import { buildEventProgramMetadata } from "@/lib/eventProgramPage";
import { fetchPublicActivity } from "@/lib/catalog/fetch-public-activity";
import { eventProgramPath } from "@/lib/publicActivity";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return buildEventProgramMetadata(id, eventProgramPath(id));
}

export default async function EventProgramPage({ params }: PageProps) {
  const { id } = await params;
  const activity = await fetchPublicActivity(id);
  if (!activity || activity.kind !== "event") {
    notFound();
  }

  return (
    <EventProgramPageClient activity={activity} sharePath={eventProgramPath(activity.id)} />
  );
}
