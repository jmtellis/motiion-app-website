"use client";

import Link from "next/link";
import { ChevronRight, MapPin, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { ConfirmationCard } from "@/components/app/TalentConfirmations";
import { ActivityCreateWizard } from "@/components/talent-buyers/activities/ActivityCreateWizard";
import { Banner } from "@/components/ui/Banner";
import { ProductEmptyState } from "@/components/ui/EmptyState";
import { useNotificationsPanel } from "@/components/workspace/WorkspaceNotifications";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import type { CalendarEvent } from "@/app/(buyer-app)/(paid)/events/actions";
import type { TalentConfirmation, TalentConfirmationData } from "@/lib/app/talent-confirmations";
import { confirmationScope } from "@/lib/talent-buyers/confirmation-model";
import { createDefaultActivityDraft } from "@/lib/talent-buyers/activities/defaults";
import "./activities.css";

export type ActivitiesScope = "upcoming" | "history";
export type ActivityType = "all" | "class" | "session" | "event" | "project";

const TYPE_ORDER = ["class", "session", "event", "project"] as const;
const TYPE_PLURAL: Record<(typeof TYPE_ORDER)[number], string> = { class: "Classes", session: "Sessions", event: "Events", project: "Projects" };

const TYPE_LABEL = { class: "Class", session: "Session", event: "Event", project: "Project" } as Record<string, string>;

type ActivityItem = {
  id: string;
  title: string;
  type: string;
  firstDate: string;
  lastDate: string;
  startTime: string;
  allDay: boolean;
  location: string;
  hosting: boolean;
  href: string | null;
  bookingId?: string;
  closed?: boolean;
};

function groupActivities(events: CalendarEvent[], hosted: Set<string>): ActivityItem[] {
  const byId = new Map<string, ActivityItem>();
  for (const event of events) {
    if (event.id.startsWith("confirmation:")) continue;
    const id = event.activityId ?? event.id;
    const current = byId.get(id);
    if (current) {
      if (event.date < current.firstDate) Object.assign(current, { firstDate: event.date, startTime: event.startTime, allDay: Boolean(event.allDay) });
      if (event.date > current.lastDate) current.lastDate = event.date;
      continue;
    }
    byId.set(id, {
      id,
      title: event.title,
      type: event.eventType,
      firstDate: event.date,
      lastDate: event.date,
      startTime: event.startTime,
      allDay: Boolean(event.allDay),
      location: event.location,
      hosting: hosted.has(id),
      href: `/activity/${id}`,
    });
  }
  return [...byId.values()];
}

function projectItems(records: TalentConfirmation[]): ActivityItem[] {
  return records.flatMap((record) => {
    const dates = record.dates.filter((entry) => typeof entry?.date === "string").sort((a, b) => a.date.localeCompare(b.date));
    return [{
      id: `project:${record.id}`,
      title: record.role && record.role !== "Project team" ? record.role : record.projectTitle,
      type: "project",
      firstDate: dates[0]?.date ?? "",
      lastDate: dates.at(-1)?.date ?? "",
      startTime: dates[0]?.start_time ?? "",
      allDay: !dates[0]?.start_time,
      location: "",
      hosting: false,
      href: null,
      bookingId: record.id,
      closed: confirmationScope(record) === "past",
    }];
  });
}

function dateParts(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  return {
    month: value.toLocaleDateString("en-US", { timeZone: "UTC", month: "short" }),
    day: value.toLocaleDateString("en-US", { timeZone: "UTC", day: "numeric" }),
    weekday: value.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" }),
  };
}

function timeLabel(item: ActivityItem) {
  if (item.allDay || !item.startTime) return "All day";
  const [hours, minutes] = item.startTime.split(":").map(Number);
  const value = new Date(Date.UTC(2000, 0, 1, hours, minutes || 0));
  return value.toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
}

function ActivityRow({ item, onOpenProject }: { item: ActivityItem; onOpenProject: (bookingId: string) => void }) {
  const parts = item.firstDate ? dateParts(item.firstDate) : null;
  const multiDay = item.lastDate !== item.firstDate;
  const content = (
    <>
      <span className="talent-activity-row__date" aria-hidden>
        <small>{parts?.month ?? "Date"}</small>
        <strong>{parts?.day ?? "TBD"}</strong>
      </span>
      <span className="talent-activity-row__copy">
        <span className="talent-activity-row__meta">
          {TYPE_LABEL[item.type] ?? "Activity"}
          {item.hosting ? <span className="talent-activity-row__badge">Hosting</span> : null}
        </span>
        <strong>{item.title}</strong>
        <small>
          {parts ? <>{parts.weekday} · {timeLabel(item)}{multiDay ? ` · through ${dateParts(item.lastDate).month} ${dateParts(item.lastDate).day}` : ""}</> : "Dates to confirm"}
          {item.location ? <><span aria-hidden> · </span><MapPin size={12} aria-hidden />{item.location}</> : null}
        </small>
      </span>
      <ChevronRight size={16} aria-hidden className="talent-activity-row__chevron" />
    </>
  );
  return (
    <li>
      {item.href ? (
        <Link href={item.href} className="talent-activity-row">{content}</Link>
      ) : (
        <button type="button" className="talent-activity-row" onClick={() => item.bookingId && onOpenProject(item.bookingId)}>{content}</button>
      )}
    </li>
  );
}

export function TalentActivitiesView({
  events,
  error,
  hostedIds,
  confirmations,
  scope: initialScope,
  type: initialType,
  initialBooking,
}: {
  events: CalendarEvent[];
  error: string | null;
  hostedIds: string[];
  confirmations: TalentConfirmationData;
  scope: ActivitiesScope;
  type: ActivityType;
  initialBooking: string | null;
}) {
  const router = useRouter();
  const notifications = useNotificationsPanel();
  const [refreshing, startRefresh] = useTransition();
  const linkedRecord = confirmations.records.find((record) => record.id === initialBooking) ?? null;
  const [scope, setScopeState] = useState<ActivitiesScope>(() => linkedRecord && confirmationScope(linkedRecord) === "past" ? "history" : initialScope);
  const [type, setTypeState] = useState<ActivityType>(initialType);
  const [bookingId, setBookingId] = useState<string | null>(linkedRecord?.id ?? null);
  const [linked, setLinked] = useState({ scope: initialScope, type: initialType, booking: initialBooking });
  if (linked.scope !== initialScope || linked.type !== initialType || linked.booking !== initialBooking) {
    setLinked({ scope: initialScope, type: initialType, booking: initialBooking });
    setScopeState(linkedRecord && confirmationScope(linkedRecord) === "past" ? "history" : initialScope);
    setTypeState(initialType);
    setBookingId(linkedRecord?.id ?? null);
  }
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  const today = new Date().toISOString().slice(0, 10);

  const items = useMemo(
    () => [...groupActivities(events, new Set(hostedIds)), ...projectItems(confirmations.records)],
    [confirmations.records, events, hostedIds],
  );
  const presentTypes = TYPE_ORDER.filter((value) => items.some((item) => item.type === value));
  const activeType = type !== "all" && presentTypes.includes(type) ? type : "all";
  const isPast = (item: ActivityItem) => Boolean(item.closed) || (item.lastDate !== "" && item.lastDate < today);
  const visible = items
    .filter((item) => activeType === "all" || item.type === activeType)
    .filter((item) => (scope === "history") === isPast(item))
    .sort((a, b) => {
      if (!a.firstDate || !b.firstDate) return a.firstDate ? -1 : b.firstDate ? 1 : 0;
      return scope === "history" ? b.lastDate.localeCompare(a.lastDate) : a.firstDate.localeCompare(b.firstDate);
    });
  const openRecord = confirmations.records.find((record) => record.id === bookingId) ?? null;

  function syncUrl(nextScope: ActivitiesScope, nextType: ActivityType) {
    const params = new URLSearchParams();
    if (nextScope === "history") params.set("scope", "history");
    if (nextType !== "all") params.set("type", nextType);
    router.replace(params.size ? `/activities?${params}` : "/activities", { scroll: false });
  }

  function openCreate() {
    notifications.setOpen(false);
    setBookingId(null);
    setWizardKey((key) => key + 1);
    setCreateOpen(true);
  }

  const loadError = error ?? confirmations.error;
  const typeLabel = activeType === "all" ? null : TYPE_PLURAL[activeType].toLowerCase();

  return (
    <div className="talent-activities">
      <header className="talent-schedule__header">
        <h1>Activities</h1>
        <button type="button" className="talent-schedule__create" onClick={openCreate}>
          <Plus size={16} aria-hidden />
          Create session
        </button>
      </header>

      <div className="talent-activities__toolbar">
        <div className="talent-activities__filters" role="group" aria-label="Activity timeframe">
          {(["upcoming", "history"] as const).map((value) => (
            <button key={value} type="button" className="ui-chip" aria-pressed={scope === value} onClick={() => { setScopeState(value); syncUrl(value, activeType); }}>
              {value === "upcoming" ? "Upcoming" : "History"}
            </button>
          ))}
        </div>
        {presentTypes.length > 1 ? (
          <label className="talent-activities__type">
            <span className="sr-only">Activity type</span>
            <select
              className="discover-browse__type-select"
              value={activeType}
              onChange={(event) => { const next = event.target.value as ActivityType; setTypeState(next); syncUrl(scope, next); }}
            >
              <option value="all">All types</option>
              {presentTypes.map((value) => <option key={value} value={value}>{TYPE_PLURAL[value]}</option>)}
            </select>
          </label>
        ) : null}
      </div>

      {loadError ? (
        <Banner
          tone="warning"
          title="Your activities couldn’t be refreshed"
          action={<button type="button" className="ui-banner__action" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>{refreshing ? "Refreshing…" : "Retry"}</button>}
        >
          {loadError}
        </Banner>
      ) : null}

      {visible.length ? (
        <ul key={`${scope}:${activeType}`} className={`talent-activities__list ui-swap${scope === "history" ? " talent-activities__list--past" : ""}`}>
          {visible.map((item) => <ActivityRow key={item.id} item={item} onOpenProject={(id) => { notifications.setOpen(false); setCreateOpen(false); setBookingId(id); }} />)}
        </ul>
      ) : loadError ? null : scope === "upcoming" ? (
        <ProductEmptyState
          illustration="calendar"
          title={typeLabel ? `No upcoming ${typeLabel}` : "Nothing coming up"}
          description="Classes you join, events you attend, projects you’re booked on, and sessions you host will show up here."
          actionLabel="Create session"
          onAction={openCreate}
          secondaryAction={{ label: "Find classes", href: "/discover" }}
        />
      ) : (
        <ProductEmptyState
          illustration="calendar"
          title={typeLabel ? `No past ${typeLabel}` : "No history yet"}
          description="Activities you’ve finished will show up here."
        />
      )}

      <WorkspaceSidePanel id="activities-project" open={Boolean(openRecord) && !notifications.open} title="Project" onClose={() => setBookingId(null)}>
        {openRecord ? <div className="talent-activities__project"><ConfirmationCard record={openRecord} /></div> : null}
      </WorkspaceSidePanel>

      <WorkspaceSidePanel id="activities-create-session" open={createOpen && !notifications.open} title="Create session" onClose={() => setCreateOpen(false)}>
        {createOpen ? (
          <ActivityCreateWizard
            key={wizardKey}
            initialDraft={createDefaultActivityDraft("session", null)}
            mode="create"
            typeLocked
            layout="panel"
            initialConnectStatus={null}
            onClose={() => setCreateOpen(false)}
            onPublished={() => {
              setCreateOpen(false);
              router.refresh();
            }}
          />
        ) : null}
      </WorkspaceSidePanel>
    </div>
  );
}
