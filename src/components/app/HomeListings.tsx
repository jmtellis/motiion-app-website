"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNotificationsPanel } from "@/components/workspace/WorkspaceNotifications";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import type { PublicActivityItem } from "@/lib/app/home-opportunities";

const PREVIEW_COUNT = 3;
const STRIP_WEEKS = 13;
type PanelKey = "classes";
type ActivityFilter = "all" | "class" | "session";

function localDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timeLabel(time: string | null) {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function scheduleLabel(item: PublicActivityItem) {
  const date = localDate(item.activity_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = timeLabel(item.start_time);
  return time ? `${date} · ${time}` : date;
}

export function HomeListings({ activities }: { activities: PublicActivityItem[] }) {
  const notifications = useNotificationsPanel();
  const [active, setActive] = useState<PanelKey | null>(null);
  const [shown, setShown] = useState<PanelKey | null>(null);

  const open = useCallback(
    (key: PanelKey) => {
      if (active === key) return setActive(null);
      notifications.setOpen(false);
      setActive(key);
      setShown(key);
    },
    [active, notifications],
  );

  return (
    <>
      <section aria-labelledby="home-classes-title">
        <SectionHeading
          id="home-classes-title"
          title="Upcoming classes & sessions"
          subtitle={activities.length ? "Train, jam, and connect with the community." : undefined}
          expanded={active === "classes"}
          panelId="home-classes-panel"
          onViewAll={activities.length ? () => open("classes") : undefined}
        />
        {activities.length ? (
          <ul className="home-activity-grid">
            {activities.slice(0, PREVIEW_COUNT).map((item) => (
              <li key={item.id}>
                <ActivityCard item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="home-listing-empty">
            <CalendarDays size={22} strokeWidth={1.6} aria-hidden />
            <div>
              <h3>No upcoming classes or sessions</h3>
              <p>New classes and sessions from the community will show up here.</p>
            </div>
          </div>
        )}
      </section>

      <WorkspaceSidePanel
        id="home-classes-panel"
        open={active === "classes" && !notifications.open}
        title="Classes & sessions"
        onClose={() => setActive(null)}
      >
        {shown === "classes" ? <ActivityBrowser items={activities} /> : null}
      </WorkspaceSidePanel>
    </>
  );
}

function SectionHeading({
  id,
  title,
  subtitle,
  expanded,
  panelId,
  onViewAll,
}: {
  id: string;
  title: string;
  subtitle?: string;
  expanded?: boolean;
  panelId?: string;
  onViewAll?: () => void;
}) {
  return (
    <div className="talent-section-heading">
      <div>
        <h2 id={id}>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {onViewAll ? (
        <button
          type="button"
          className="home-view-all"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onViewAll}
        >
          View all
        </button>
      ) : null}
    </div>
  );
}

function ActivityCard({ item }: { item: PublicActivityItem }) {
  return (
    <Link href={item.href} className="home-activity-card">
      {item.cover_image_url ? (
        <Image src={item.cover_image_url} alt="" fill sizes="(max-width: 767px) 90vw, 33vw" unoptimized />
      ) : (
        <CalendarDays size={40} strokeWidth={1.2} aria-hidden className="home-activity-card__icon" />
      )}
      <div className="home-activity-card__copy">
        <span className="home-activity-card__chip">{item.type === "class" ? "Class" : "Session"}</span>
        <h3>{item.title}</h3>
        <p>{[scheduleLabel(item), item.location].filter(Boolean).join(" · ")}</p>
      </div>
    </Link>
  );
}

function ActivityBrowser({ items }: { items: PublicActivityItem[] }) {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const days = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: STRIP_WEEKS * 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, []);
  const filtered = useMemo(() => items.filter((item) => filter === "all" || item.type === filter), [items, filter]);
  const scheduled = useMemo(() => new Set(filtered.map((item) => item.activity_date.slice(0, 10))), [filtered]);
  const todayKey = dayKey(new Date());
  const [selected, setSelected] = useState(
    () => items.find((item) => item.activity_date.slice(0, 10) >= todayKey)?.activity_date.slice(0, 10) ?? todayKey,
  );
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    stripRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selected]);

  const dayItems = filtered.filter((item) => item.activity_date.slice(0, 10) === selected);
  const selectedDate = localDate(selected);

  return (
    <div className="home-browser">
      <div className="home-browser__filters" role="group" aria-label="Type">
        {(["all", "class", "session"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {value === "all" ? "All" : value === "class" ? "Classes" : "Sessions"}
          </button>
        ))}
      </div>
      <div className="home-date-strip" ref={stripRef} role="group" aria-label="Choose a date">
        {days.map((date) => {
          const key = dayKey(date);
          const past = key < todayKey;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={key === selected}
              aria-label={date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              disabled={past}
              onClick={() => setSelected(key)}
            >
              <span>{date.toLocaleDateString("en-US", { weekday: "narrow" })}</span>
              <strong>{date.getDate()}</strong>
              <i data-on={scheduled.has(key)} aria-hidden />
            </button>
          );
        })}
      </div>
      <section className="home-browser__group">
        <h3>{selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</h3>
        {dayItems.length ? (
          <ul>
            {dayItems.map((item) => (
              <li key={item.id}>
                <ActivityCard item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-browser__empty">Nothing scheduled this day. Pick a date with a dot to see what&apos;s on.</p>
        )}
      </section>
    </div>
  );
}
