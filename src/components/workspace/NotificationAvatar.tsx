"use client";

import { useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
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
  const [snapshot, setSnapshot] = useState<{ key: string; actors: Record<string, NotificationActor> }>({ key: "", actors: {} });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void fetchNotificationActors(key.split("|")).then((next) => {
      if (!cancelled) setSnapshot({ key, actors: next });
    }).catch(() => {
      // Notification text remains useful when optional actor hydration fails.
      if (!cancelled) setSnapshot({ key, actors: {} });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return snapshot.key === key ? snapshot.actors : {};
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
  return <Avatar className="notification-avatar" src={actor?.avatarUrl} name={name} />;
}
