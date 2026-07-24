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

export function useBuyerNotifications(userId: string, options?: { limit?: number }) {
  const limit = options?.limit ?? 15;
  const [notifications, setNotifications] = useState<BuyerNotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter((row) => !row.read_at).length;

  const loadNotifications = useCallback(async () => {
    const supabase = createClientSupabaseClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (data) setNotifications(data);
    setIsLoading(false);
  }, [limit, userId]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const supabase = createClientSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`notifications-${userId}-${limit}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void loadNotifications(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications, limit]);

  const markAllRead = useCallback(async () => {
    const supabase = createClientSupabaseClient();
    if (!supabase) return;

    const unreadIds = notifications.filter((row) => !row.read_at).map((row) => row.id);
    if (!unreadIds.length) return;

    const now = new Date().toISOString();
    setNotifications((current) => current.map((row) => (row.read_at ? row : { ...row, read_at: now })));
    await supabase.from("notifications").update({ read_at: now }).in("id", unreadIds);
  }, [notifications]);

  return { notifications, unreadCount, isLoading, loadNotifications, markAllRead };
}
