"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ActivityCreateWizard } from "@/components/talent-buyers/activities/ActivityCreateWizard";
import { EventsCalendar } from "@/components/talent-buyers/dashboard/calendar/EventsCalendar";
import { useNotificationsPanel } from "@/components/workspace/WorkspaceNotifications";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import type { TalentScheduleFilter } from "@/lib/app/schedule";
import { createDefaultActivityDraft } from "@/lib/talent-buyers/activities/defaults";
import "@/components/talent-buyers/dashboard/buyer-chrome.css";

const FILTERS: { value: TalentScheduleFilter; label: string }[] = [
  { value: "all", label: "All activities" },
  { value: "classes", label: "Classes" },
  { value: "sessions", label: "Sessions" },
  { value: "events", label: "Events" },
];

function talentEventHref(event: CalendarEvent) {
  if (event.eventType === "event") return `/event/${event.id}`;
  return `/activity/${event.id}`;
}

function matchesFilter(event: CalendarEvent, filter: TalentScheduleFilter) {
  if (filter === "classes") return event.eventType === "class";
  if (filter === "sessions") return event.eventType === "session";
  if (filter === "events") return event.eventType === "event";
  return event.eventType === "class" || event.eventType === "session" || event.eventType === "event";
}

export function TalentScheduleCalendar({
  events,
  filter: initialFilter,
}: {
  events: CalendarEvent[];
  filter: TalentScheduleFilter;
}) {
  const router = useRouter();
  const notifications = useNotificationsPanel();
  const [filter, setFilterState] = useState(initialFilter);
  const [syncedFilter, setSyncedFilter] = useState(initialFilter);
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);

  if (initialFilter !== syncedFilter) {
    setSyncedFilter(initialFilter);
    setFilterState(initialFilter);
  }

  const visible = useMemo(
    () => events.filter((event) => matchesFilter(event, filter)),
    [events, filter],
  );

  function setFilter(next: TalentScheduleFilter) {
    setFilterState(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "all") params.delete("filter");
    else params.set("filter", next);
    const query = params.toString();
    router.replace(query ? `/schedule?${query}` : "/schedule", { scroll: false });
  }

  function openCreate() {
    notifications.setOpen(false);
    setWizardKey((key) => key + 1);
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
  }

  return (
    <div className="talent-schedule buyer-dashboard buyer-calendar-page events-hub events-hub--schedule">
      <header className="talent-schedule__header">
        <h1>Schedule</h1>
        <button type="button" className="talent-schedule__create" onClick={openCreate}>
          <Plus size={16} aria-hidden />
          Create session
        </button>
      </header>

      <EventsCalendar
        events={visible}
        embedded
        layout="page"
        eventHref={talentEventHref}
        actionLabel="Open"
        filter={
          <select
            className="talent-schedule__type"
            aria-label="Activity type"
            value={filter}
            onChange={(event) => setFilter(event.target.value as TalentScheduleFilter)}
          >
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        }
      />

      <WorkspaceSidePanel
        id="schedule-create-session"
        open={createOpen && !notifications.open}
        title="Create session"
        onClose={closeCreate}
      >
        {createOpen ? (
          <ActivityCreateWizard
            key={wizardKey}
            initialDraft={createDefaultActivityDraft("session", null)}
            mode="create"
            typeLocked
            layout="panel"
            initialConnectStatus={null}
            onClose={closeCreate}
            onPublished={() => {
              closeCreate();
              router.refresh();
            }}
          />
        ) : null}
      </WorkspaceSidePanel>
    </div>
  );
}
