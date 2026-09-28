"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { getProfileInitials } from "@/lib/auth/avatar";
import { fetchNotificationActors, type NotificationActor } from "@/lib/app/notification-actors";
import { notificationActorName, notificationActorUserId } from "@/lib/app/notification-inbox";

type ActorSource = {
  id: string;
  data: Record<string, unknown> | null;
};

export function useNotificationActors(rows: ActorSource[]) {
  const ids = useMemo(() => {
    const found = new Set<string>();
    for (const row of rows) {
      const id = notificationActorUserId(row.data);
      if (id) found.add(id);
    }
    return [...found];
  }, [rows]);
  const key = ids.join("|");
  const [actors, setActors] = useState<Record<string, NotificationActor>>({});

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void fetchNotificationActors(key.split("|")).then((next) => {
      if (!cancelled) setActors(next);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return actors;
}

export function NotificationAvatar({
  data,
  actors,
  fallback,
}: {
  data: Record<string, unknown> | null;
  actors: Record<string, NotificationActor>;
  fallback?: string | null;
}) {
  const userId = notificationActorUserId(data);
  const actor = userId ? actors[userId] : undefined;
  const name = actor?.name || notificationActorName(data) || fallback || "";
  const initials = getProfileInitials(name) || "?";

  if (actor?.avatarUrl) {
    return (
      <Image
        className="notification-avatar"
        src={actor.avatarUrl}
        alt=""
        width={40}
        height={40}
        unoptimized
      />
    );
  }

  return (
    <span className="notification-avatar" aria-hidden>
      {initials}
    </span>
  );
}
