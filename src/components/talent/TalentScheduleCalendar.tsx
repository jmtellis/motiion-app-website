"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { ActivityCreateWizard } from "@/components/talent-buyers/activities/ActivityCreateWizard";
import { Banner } from "@/components/ui/Banner";
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
  return event.href ?? `/activity/${event.activityId ?? event.id}`;
}

function matchesFilter(event: CalendarEvent, filter: TalentScheduleFilter) {
  if (filter === "classes") return event.eventType === "class";
  if (filter === "sessions") return event.eventType === "session";
  if (filter === "events") return event.eventType === "event";
  return event.eventType === "class" || event.eventType === "session" || event.eventType === "event";
}

export function TalentScheduleCalendar({
  events,
  error = null,
  filter: initialFilter,
}: {
  events: CalendarEvent[];
  error?: string | null;
  filter: TalentScheduleFilter;
}) {
  const router = useRouter();
  const notifications = useNotificationsPanel();
  const [refreshing, startRefresh] = useTransition();
  const [lastGoodEvents, setLastGoodEvents] = useState(events);
  if (!error && lastGoodEvents !== events) setLastGoodEvents(events);
  const displayedEvents = error && !events.length ? lastGoodEvents : events;
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);
  const [filter, setFilterState] = useState(initialFilter);
  const [syncedFilter, setSyncedFilter] = useState(initialFilter);
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);

  if (initialFilter !== syncedFilter) {
    setSyncedFilter(initialFilter);
    setFilterState(initialFilter);
  }

  const visible = useMemo(
    () => displayedEvents.filter((event) => matchesFilter(event, filter)),
    [displayedEvents, filter],
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
        <h1>Calendar</h1>
        <button type="button" className="talent-schedule__create" onClick={openCreate}>
          <Plus size={16} aria-hidden />
          Create session
        </button>
      </header>

      {error ? (
        <Banner
          tone="warning"
          title="Your calendar couldn’t be refreshed"
          action={
            <button type="button" className="ui-banner__action" disabled={refreshing}
              onClick={() => startRefresh(() => router.refresh())}>{refreshing ? "Refreshing…" : "Retry calendar"}</button>
          }
        >
          {error}
        </Banner>
      ) : null}
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
