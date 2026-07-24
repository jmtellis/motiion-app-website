"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type {
  ActivityHubItem,
  CalendarEvent,
  ExploreActivityItem,
} from "@/app/(buyer-app)/(paid)/events/actions";
import { CreateActivityButton } from "@/components/talent-buyers/dashboard/CreateActivityButton";
import { EventCard } from "@/components/talent-buyers/dashboard/EventCard";
import { EventsCalendar } from "@/components/talent-buyers/dashboard/calendar/EventsCalendar";
import {
  EventsEmptyState,
  EventsGhostGrid,
} from "@/components/talent-buyers/dashboard/EventsEmptyState";
import { SegmentedControl } from "@/components/talent-buyers/dashboard/SegmentedControl";
import { UnderlineTabs } from "@/components/talent-buyers/dashboard/UnderlineTabs";

import "./events-hub.css";

type EventsMode = "explore" | "manage" | "schedule";
type RosterFilter = "all" | "hosting" | "attending" | "archive";
type ExploreFilter = "all" | "popular" | "near";

const MODE_OPTIONS: { value: EventsMode; label: string }[] = [
  { value: "explore", label: "Explore" },
  { value: "manage", label: "Manage" },
  { value: "schedule", label: "Schedule" },
];

const MANAGE_FILTER_OPTIONS: { value: RosterFilter; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "hosting", label: "Hosting" },
  { value: "attending", label: "Attending" },
  { value: "archive", label: "Archive" },
];

const EXPLORE_FILTER_OPTIONS: { value: ExploreFilter; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "popular", label: "Popular" },
  { value: "near", label: "Near Me" },
];

function filterManageItems(
  upcoming: ActivityHubItem[],
  past: ActivityHubItem[],
  filter: RosterFilter,
): ActivityHubItem[] {
  if (filter === "archive") return past;
  if (filter === "hosting") {
    return upcoming.filter((item) => item.participation === "hosting");
  }
  if (filter === "attending") {
    return upcoming.filter((item) => item.participation === "attending");
  }
  return upcoming;
}

function filterExploreItems(
  items: ExploreActivityItem[],
  filter: ExploreFilter,
  viewerCity: string | null,
): ExploreActivityItem[] {
  if (filter === "popular") {
    return [...items].sort((a, b) => b.attendeeCount - a.attendeeCount || a.dateTime.localeCompare(b.dateTime));
  }
  if (filter === "near") {
    if (!viewerCity) return [];
    const needle = viewerCity.toLowerCase();
    return items.filter((item) => item.location.toLowerCase().includes(needle));
  }
  return items;
}

function modeToHref(mode: EventsMode) {
  if (mode === "schedule") return "/events?view=schedule";
  if (mode === "manage") return "/events?view=manage";
  return "/events";
}

export function EventsHubPage({
  upcoming,
  past,
  calendarEvents,
  exploreItems,
  viewerCity,
  initialMode = "explore",
}: {
  upcoming: ActivityHubItem[];
  past: ActivityHubItem[];
  calendarEvents: CalendarEvent[];
  exploreItems: ExploreActivityItem[];
  viewerCity: string | null;
  initialMode?: EventsMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<EventsMode>(initialMode);
  const [manageFilter, setManageFilter] = useState<RosterFilter>("all");
  const [exploreFilter, setExploreFilter] = useState<ExploreFilter>("all");

  const manageItems = useMemo(
    () => filterManageItems(upcoming, past, manageFilter),
    [upcoming, past, manageFilter],
  );

  const exploreFiltered = useMemo(
    () => filterExploreItems(exploreItems, exploreFilter, viewerCity),
    [exploreItems, exploreFilter, viewerCity],
  );

  const isEmptyManageHub = upcoming.length === 0 && past.length === 0;

  function handleModeChange(next: EventsMode) {
    setMode(next);
    router.replace(modeToHref(next), { scroll: false });
  }

  return (
    <div
      className={`events-hub${mode === "schedule" ? " events-hub--schedule" : ""}${
        isEmptyManageHub && mode === "manage" ? " events-hub--empty" : ""
      }`}
    >
      <div className="events-hub__mode-row">
        <SegmentedControl
          ariaLabel="Events views"
          value={mode}
          onChange={handleModeChange}
          options={MODE_OPTIONS}
          equalWidth
          activeTone="white"
        />
      </div>

      {mode === "schedule" ? (
        <>
          <div className="events-hub__title-row">
            <h1 className="events-hub__title">Events</h1>
          </div>
          <div className="events-hub__schedule">
            <EventsCalendar events={calendarEvents} embedded />
          </div>
        </>
      ) : mode === "explore" ? (
        <>
          <div className="events-hub__title-row">
            <h1 className="sr-only">Events</h1>
            <UnderlineTabs
              ariaLabel="Explore filters"
              value={exploreFilter}
              onChange={setExploreFilter}
              options={EXPLORE_FILTER_OPTIONS}
            />
            <CreateActivityButton
              triggerClassName="buyer-chrome-bar__cta events-hub__create"
              triggerLabel="Create activity"
              showPlusIcon
            />
          </div>

          {exploreFiltered.length ? (
            <div className="events-hub__list">
              {exploreFiltered.map((item) => (
                <Link
                  key={item.id}
                  href={`/calendar/${item.id}`}
                  className="events-hub__list-link"
                >
                  <EventCard event={item} variant="dark" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="buyer-empty">
              <EventsGhostGrid
                interactive={false}
                label={
                  exploreFilter === "near"
                    ? "No activities near you yet"
                    : exploreFilter === "popular"
                      ? "No popular activities yet"
                      : "No open activities yet"
                }
              />
            </div>
          )}
        </>
      ) : isEmptyManageHub ? (
        <>
          <div className="events-hub__title-row">
            <h1 className="events-hub__title">Events</h1>
          </div>
          <EventsEmptyState onOpenSchedule={() => handleModeChange("schedule")} />
        </>
      ) : (
        <>
          <div className="events-hub__title-row">
            <h1 className="sr-only">Events</h1>
            <UnderlineTabs
              ariaLabel="Activity scope"
              value={manageFilter}
              onChange={setManageFilter}
              options={MANAGE_FILTER_OPTIONS}
            />
            <CreateActivityButton
              triggerClassName="buyer-chrome-bar__cta events-hub__create"
              triggerLabel="Create activity"
              showPlusIcon
            />
          </div>

          {manageItems.length ? (
            <div className="events-hub__list">
              {manageItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/calendar/${item.id}`}
                  className="events-hub__list-link"
                >
                  <EventCard event={item} variant="dark" />
                  <span className="events-hub__list-badge">
                    {item.participation === "hosting" ? "Hosting" : "Attending"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="buyer-empty">
              <EventsGhostGrid
                interactive={false}
                label={`No ${manageFilter === "all" ? "" : `${manageFilter} `}activities yet`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
