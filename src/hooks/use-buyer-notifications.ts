"use client";

import { useCallback, useEffect, useState } from "react";

import { createClientSupabaseClient } from "@/lib/supabase/client";

export type BuyerNotificationRow = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export function useBuyerNotifications(
  userId: string,
  options?: { limit?: number },
) {
  const limit = options?.limit ?? 15;
  const [notifications, setNotifications] = useState<BuyerNotificationRow[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter((row) => !row.read_at).length;

  const loadNotifications = useCallback(async () => {
    const supabase = createClientSupabaseClient();
    if (!supabase) {
      setError("Notifications are unavailable. Please try again.");
      setIsLoading(false);
      return;
    }

    setError(null);
    const { data, error: loadError } = await supabase
      .from("notifications")
      .select("id, type, title, body, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (loadError) setError("Could not load notifications.");
    if (data) setNotifications(data);
    setIsLoading(false);
  }, [limit, userId]);

  useEffect(() => {
    // Fetch the initial external snapshot, then keep it in sync via realtime.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const supabase = createClientSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`notifications-${userId}-${limit}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => void loadNotifications(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications, limit]);

  const markAllRead = useCallback(async () => {
    const supabase = createClientSupabaseClient();
    if (!supabase) {
      setError("Could not update notifications.");
      return;
    }

    const unreadIds = notifications
      .filter((row) => !row.read_at)
      .map((row) => row.id);
    if (!unreadIds.length) return;

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .in("id", unreadIds);
    if (updateError) {
      setError("Could not mark updates as read. Please try again.");
      return;
    }
    setError(null);
    setNotifications((current) =>
      current.map((row) =>
        unreadIds.includes(row.id) ? { ...row, read_at: now } : row,
      ),
    );
  }, [notifications, userId]);

  return {
    error,
    notifications,
    unreadCount,
    isLoading,
    loadNotifications,
    markAllRead,
  };
}
