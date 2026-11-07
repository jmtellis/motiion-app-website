"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { PublicActivityItem } from "@/lib/app/home-opportunities";

const STRIP_WEEKS = 13;
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
  const date = localDate(item.activity_date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = timeLabel(item.start_time);
  return time ? `${date} · ${time}` : date;
}

export function ActivityCard({ item }: { item: PublicActivityItem }) {
  const kind = item.type === "class" ? "Class" : "Session";
  return (
    <Link href={item.href} className="ui-media-card">
      <span className="ui-media-card__media">
        {item.cover_image_url ? (
          <Image
            src={item.cover_image_url}
            alt=""
            fill
            sizes="(max-width: 767px) 90vw, 33vw"
            unoptimized
          />
        ) : (
          <CalendarDays size={30} strokeWidth={1.5} aria-hidden />
        )}
        <span className="ui-media-card__chip">{kind}</span>
      </span>
      <span className="ui-media-card__body">
        <span className="ui-media-card__eyebrow">{scheduleLabel(item)}</span>
        <h3 className="ui-media-card__title">{item.title}</h3>
        {item.location ? <p className="ui-media-card__text">{item.location}</p> : null}
        <span className="ui-media-card__footer">
          <span className="ui-media-card__cta">View {kind.toLowerCase()}</span>
        </span>
      </span>
    </Link>
  );
}

export function ActivityBrowser({ items }: { items: PublicActivityItem[] }) {
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
  const filtered = useMemo(
    () => items.filter((item) => filter === "all" || item.type === filter),
    [items, filter],
  );
  const scheduled = useMemo(
    () => new Set(filtered.map((item) => item.activity_date.slice(0, 10))),
    [filtered],
  );
  const todayKey = dayKey(new Date());
  const [selected, setSelected] = useState(
    () =>
      items.find((item) => item.activity_date.slice(0, 10) >= todayKey)?.activity_date.slice(0, 10) ??
      todayKey,
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
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
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
              aria-label={date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
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
        <h3>
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </h3>
        {dayItems.length ? (
          <ul>
            {dayItems.map((item) => (
              <li key={item.id}>
                <ActivityCard item={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-browser__empty">
            Nothing scheduled this day. Pick a date with a dot to see what&apos;s on.
          </p>
        )}
      </section>
    </div>
  );
}
