"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { EventsCalendar } from "@/components/talent-buyers/dashboard/calendar/EventsCalendar";
import { localizeScheduleMarkers, type ScheduleMarker } from "@/lib/talent-buyers/schedule-markers";
import { AddProjectActivityButton } from "./AddProjectActivityButton";
import { useProjectWorkspace } from "./ProjectWorkspaceContext";

const subscribeNever = () => () => {};
export function ProjectSchedulePanel({ markers, error }: { markers: ScheduleMarker[]; error: string | null }) {
  const { projectId, project } = useProjectWorkspace();
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const events = useMemo(() => hydrated ? localizeScheduleMarkers(markers) : markers, [markers, hydrated]);
  return <section className="project-schedule">
    <div className="project-schedule__content">
    {error ? <p role="status">{error} <button type="button" className="bd-btn-secondary" onClick={() => router.refresh()}>Retry</button></p> : null}
    <EventsCalendar events={events} embedded layout="page" markerMode defaultView="week" />
    </div>
    {project.isOwner !== false ? <AddProjectActivityButton projectId={projectId} triggerLabel="Add activity" iconOnly triggerClassName="project-schedule__add" /> : null}
  </section>;
}
