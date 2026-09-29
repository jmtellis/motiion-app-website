import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatRelativeUpdated } from "../src/lib/talent-buyers/relative-time";
import {
  collectionStackPeople,
  collectionTileSublabel,
  MAX_PEEKING,
  rosterStackTileAccessibleLabel,
} from "../src/lib/talent-buyers/roster-stack";
import {
  activityScheduleHref,
  buildActivityScheduleMarkers,
  buildJobScheduleMarkers,
  buildProjectScheduleMarkers,
  formatNextBeat,
  groupMarkersByWork,
  localDateTimeParts,
  MAX_MARKERS_PER_WORK_ITEM,
  pickNextBeat,
  scheduleMarkerAccessibleLabel,
  scheduleMarkerDisplay,
  sortScheduleMarkers,
  upcomingBeatsByWork,
  type ScheduleActivityInput,
  type ScheduleProjectInput,
} from "../src/lib/talent-buyers/schedule-markers";

function project(overrides: Partial<ScheduleProjectInput> = {}): ScheduleProjectInput {
  return {
    id: "p1",
    title: "SNS Tour",
    composable: true,
    projectType: "production",
    castingEnabled: false,
    startDate: null,
    endDate: null,
    location: "Los Angeles",
    castingConfiguration: null,
    ...overrides,
  };
}

function activity(overrides: Partial<ScheduleActivityInput> = {}): ScheduleActivityInput {
  return {
    id: "a1",
    title: "Heels Basics",
    type: "class",
    activityDate: "2026-10-05",
    startTime: "18:00:00",
    endTime: "19:30:00",
    location: "Studio A",
    attendeeCount: 4,
    eventDays: [],
    project: null,
    ...overrides,
  };
}

const formatDate = (date: string) => date;
const formatTime = (time: string) => time;

describe("project schedule markers", () => {
  it("falls back to shell start / wrap dates and opens project home", () => {
    const markers = buildProjectScheduleMarkers(project({ startDate: "2026-10-01", endDate: "2026-10-20" }));
    assert.deepEqual(
      markers.map((marker) => [marker.date, marker.title, marker.href, marker.allDay]),
      [
        ["2026-10-01", "Starts", "/projects/p1/overview", true],
        ["2026-10-20", "Wraps", "/projects/p1/overview", true],
      ],
    );
    assert.equal(markers[0].workId, "p1");
    assert.equal(markers[0].contextLabel, "Project");
  });

  it("prefers casting schedule categories over shell dates", () => {
    const markers = buildProjectScheduleMarkers(
      project({
        startDate: "2026-10-01",
        castingConfiguration: {
          schedule_categories: [
            { id_key: "c1", activity_type_raw: "Rehearsal", selected_days_yyyymmdd: ["20261003", "20261002"] },
            { id_key: "c2", activity_type_raw: "Custom", custom_schedule_title: "Tech run", selected_days_yyyymmdd: ["20261004"] },
          ],
        },
      }),
    );
    assert.deepEqual(
      markers.map((marker) => [marker.date, marker.title]),
      [
        ["2026-10-02", "Rehearsal"],
        ["2026-10-03", "Rehearsal"],
        ["2026-10-04", "Tech run"],
      ],
    );
  });

  it("expands rehearsal and production ranges without double-counting a day", () => {
    const markers = buildProjectScheduleMarkers(
      project({
        castingConfiguration: {
          rehearsal_date_ranges: [{ start_yyyymmdd: "20261001", end_yyyymmdd: "20261002" }],
          production_date_ranges: [{ start_yyyymmdd: "20261002", end_yyyymmdd: "20261003" }],
        },
      }),
    );
    assert.deepEqual(
      markers.map((marker) => [marker.date, marker.title]),
      [
        ["2026-10-01", "Rehearsal"],
        ["2026-10-02", "Rehearsal"],
        ["2026-10-03", "Show / shoot day"],
      ],
    );
  });

  it("adds timed audition/callback beats and an all-day deadline only when Casting is on", () => {
    const castingConfiguration = {
      submission_deadline_iso8601: "2026-09-30",
      audition_sessions: [
        {
          id_key: "s1",
          title: "Open call",
          datetime_iso8601: "2026-10-03T18:00",
          has_callback: true,
          callback_datetime_iso8601: "2026-10-04T10:30",
          location_mode_raw: "in_person",
          location_same_as_production: true,
        },
      ],
    };
    assert.equal(buildProjectScheduleMarkers(project({ castingConfiguration })).length, 0);

    const markers = sortScheduleMarkers(
      buildProjectScheduleMarkers(project({ castingEnabled: true, castingConfiguration })),
    );
    assert.deepEqual(
      markers.map((marker) => [marker.date, marker.title, marker.allDay, marker.startTime, marker.eventType]),
      [
        ["2026-09-30", "Submissions close", true, "00:00", "casting"],
        ["2026-10-03", "Open call", false, "18:00", "audition"],
        ["2026-10-04", "Open call callback", false, "10:30", "audition"],
      ],
    );
    for (const marker of markers) {
      assert.equal(marker.href, "/projects/p1/workspace/breakdown");
      assert.equal(marker.contextLabel, "Casting");
    }
  });

  it("routes legacy casting projects to their casting workspace", () => {
    const [marker] = buildProjectScheduleMarkers(
      project({ composable: false, projectType: "casting", startDate: "2026-10-01" }),
    );
    assert.equal(marker.href, "/projects/p1/workspace/breakdown");
  });

  it("caps markers per work item", () => {
    const days = Array.from({ length: MAX_MARKERS_PER_WORK_ITEM + 50 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 0, 1 + index));
      return date.toISOString().slice(0, 10).replaceAll("-", "");
    });
    const markers = buildProjectScheduleMarkers(
      project({
        castingConfiguration: {
          schedule_categories: [{ id_key: "c", activity_type_raw: "Rehearsal", selected_days_yyyymmdd: days }],
        },
      }),
    );
    assert.equal(markers.length, MAX_MARKERS_PER_WORK_ITEM);
  });
});

describe("activity and job schedule markers", () => {
  it("opens a composable project's Classes ability for class sessions", () => {
    const inProject = { id: "p1", title: "SNS Tour", composable: true };
    assert.equal(activityScheduleHref({ id: "a1", type: "class", project: inProject }), "/projects/p1/classes");
    assert.equal(activityScheduleHref({ id: "a1", type: "event", project: inProject }), "/projects/p1/overview");
    assert.equal(
      activityScheduleHref({ id: "a1", type: "class", project: { ...inProject, composable: false } }),
      "/calendar/a1",
    );
    assert.equal(activityScheduleHref({ id: "a1", type: "session", project: null }), "/calendar/a1");
  });

  it("groups class sessions under their project and labels them", () => {
    const [marker] = buildActivityScheduleMarkers(
      activity({ project: { id: "p1", title: "SNS Tour", composable: true } }),
    );
    assert.equal(marker.workId, "p1");
    assert.equal(marker.workTitle, "SNS Tour");
    assert.equal(marker.contextLabel, "Classes");
    assert.equal(marker.startTime, "18:00");
    assert.equal(marker.endTime, "19:30");
    assert.equal(marker.allDay, false);
  });

  it("uses per-day schedule rows when present", () => {
    const markers = buildActivityScheduleMarkers(
      activity({
        type: "event",
        eventDays: [
          { dayDate: "2026-10-07", startTime: "10:00:00", endTime: null },
          { dayDate: "2026-10-06", startTime: null, endTime: null },
        ],
      }),
    );
    assert.deepEqual(
      markers.map((marker) => [marker.date, marker.startTime, marker.endTime]),
      [
        ["2026-10-06", "18:00", "19:30"],
        ["2026-10-07", "10:00", "19:30"],
      ],
    );
    assert.equal(markers[0].workId, "a1");
    assert.equal(markers[0].contextLabel, "Event");
  });

  it("drops undated activities", () => {
    assert.equal(buildActivityScheduleMarkers(activity({ activityDate: null })).length, 0);
  });

  it("marks job start and wrap days", () => {
    const markers = buildJobScheduleMarkers({
      id: "j1",
      title: "Music video",
      startDate: "2026-10-10",
      endDate: "2026-10-10",
      location: null,
    });
    assert.deepEqual(
      markers.map((marker) => [marker.date, marker.title, marker.href]),
      [["2026-10-10", "Starts", "/jobs/j1"]],
    );
  });
});

describe("marker helpers", () => {
  it("parses stored timestamps", () => {
    assert.deepEqual(localDateTimeParts("2026-10-03"), { date: "2026-10-03", time: null });
    assert.deepEqual(localDateTimeParts("2026-10-03T18:05:00"), { date: "2026-10-03", time: "18:05" });
    assert.equal(localDateTimeParts("not a date"), null);
    assert.equal(localDateTimeParts(""), null);
  });

  it("sorts all-day beats before timed beats on the same day", () => {
    const [timed] = buildActivityScheduleMarkers(activity({ activityDate: "2026-10-01" }));
    const [allDay] = buildProjectScheduleMarkers(project({ startDate: "2026-10-01" }));
    assert.deepEqual(
      sortScheduleMarkers([timed, allDay]).map((marker) => marker.id),
      [allDay.id, timed.id],
    );
  });

  it("leads chip copy with the work item and describes the destination", () => {
    const [marker] = buildProjectScheduleMarkers(project({ startDate: "2026-10-01" }));
    assert.deepEqual(scheduleMarkerDisplay(marker), { primary: "SNS Tour", secondary: "Starts" });
    assert.equal(
      scheduleMarkerAccessibleLabel(marker, formatDate, formatTime),
      "SNS Tour: Starts · Project, 2026-10-01. Opens project.",
    );

    const [standalone] = buildActivityScheduleMarkers(activity());
    assert.deepEqual(scheduleMarkerDisplay(standalone), { primary: "Heels Basics", secondary: "Class" });
    assert.equal(
      scheduleMarkerAccessibleLabel(standalone, formatDate, formatTime),
      "Heels Basics: Class, 2026-10-05, 18:00. Opens class.",
    );
  });

  it("groups a busy day by project for the disambiguation list", () => {
    const markers = [
      ...buildProjectScheduleMarkers(project({ startDate: "2026-10-01" })),
      ...buildActivityScheduleMarkers(
        activity({ activityDate: "2026-10-01", project: { id: "p1", title: "SNS Tour", composable: true } }),
      ),
      ...buildProjectScheduleMarkers(project({ id: "p2", title: "Nike Spot", startDate: "2026-10-01" })),
    ];
    const groups = groupMarkersByWork(markers);
    assert.deepEqual(
      groups.map((group) => [group.workId, group.markers.length]),
      [
        ["p1", 2],
        ["p2", 1],
      ],
    );
  });

  it("picks each work item's next beat on Home", () => {
    const markers = [
      ...buildProjectScheduleMarkers(project({ startDate: "2026-09-01", endDate: "2026-10-20" })),
      ...buildJobScheduleMarkers({ id: "j1", title: "Job", startDate: "2026-08-01", endDate: null, location: null }),
    ];
    const beats = upcomingBeatsByWork(markers, "2026-09-28");
    assert.deepEqual([...beats.keys()], ["p1"]);

    const next = pickNextBeat(beats.get("p1"), "2026-09-29");
    assert.ok(next);
    assert.equal(formatNextBeat(next, formatDate, formatTime), "Wraps · 2026-10-20");
    assert.equal(pickNextBeat(undefined, "2026-09-29"), null);
  });
});

describe("roster stack tiles", () => {
  it("announces group, count, and time, then the destination", () => {
    assert.equal(
      rosterStackTileAccessibleLabel("SNS Tour", "12 people · 3d ago"),
      "SNS Tour, 12 people, 3d ago. Opens full roster.",
    );
    assert.equal(rosterStackTileAccessibleLabel("Roster"), "Roster. Opens full roster.");
  });

  it("peeks at most three members and pads faceless ones", () => {
    const people = collectionStackPeople({
      id: "c1",
      name: "SNS Tour",
      talentCount: 8,
      previewAvatars: ["https://x.supabase.co/a.jpg"],
    });
    assert.equal(people.length, MAX_PEEKING);
    assert.equal(people[0].avatarUrl, "https://x.supabase.co/a.jpg");
    assert.equal(people[1].avatarUrl, null);
    assert.equal(
      collectionStackPeople({ id: "c2", name: "Empty", talentCount: 0, previewAvatars: [] }).length,
      0,
    );
  });

  it("formats the tile sublabel", () => {
    const now = Date.parse("2026-09-29T12:00:00Z");
    assert.equal(
      collectionTileSublabel({ talentCount: 1, updatedAt: "2026-09-29T09:00:00Z" }, now),
      "1 person · 3h ago",
    );
    assert.equal(collectionTileSublabel({ talentCount: 4, updatedAt: "" }, now), "4 people");
  });

  it("formats relative update times", () => {
    const now = Date.parse("2026-09-29T12:00:00Z");
    assert.equal(formatRelativeUpdated("2026-09-29T11:59:30Z", now), "just now");
    assert.equal(formatRelativeUpdated("2026-09-29T11:15:00Z", now), "45m ago");
    assert.equal(formatRelativeUpdated("2026-09-27T12:00:00Z", now), "2d ago");
    assert.equal(formatRelativeUpdated("2026-09-01T12:00:00Z", now), "Sep 1");
    assert.equal(formatRelativeUpdated("2025-12-01T12:00:00Z", now), "Dec 1, 2025");
    assert.equal(formatRelativeUpdated(null, now), null);
  });
});
