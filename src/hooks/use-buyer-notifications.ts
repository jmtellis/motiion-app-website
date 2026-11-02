"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BLOCKED_USERS_CHANGED_EVENT, allowsUser, normalizeBlockedUserIds } from "@/lib/app/blocked-visibility-model";
import { notificationActorUserId, isVisibleAlertNotification, isCoordinationNotification } from "@/lib/app/notification-inbox";
import { createClientSupabaseClient } from "@/lib/supabase/client";

export type BuyerNotificationRow = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

const EMPTY_NOTIFICATIONS: BuyerNotificationRow[] = [];

export function useBuyerNotifications(
  userId: string,
  options?: { limit?: number },
) {
  const limit = options?.limit ?? 15;
  const [snapshot, setSnapshot] = useState<{ owner: string; rows: BuyerNotificationRow[]; error: string | null; loaded: boolean }>({ owner: userId, rows: [], error: null, loaded: false });
  const requestVersion = useRef(0);
  const notifications = snapshot.owner === userId ? snapshot.rows : EMPTY_NOTIFICATIONS;
  const error = snapshot.owner === userId ? snapshot.error : null;
  const isLoading = snapshot.owner !== userId || !snapshot.loaded;
  const unreadCount = notifications.filter((row) => !row.read_at).length;
  const setError = useCallback((error: string | null) => setSnapshot((current) => current.owner === userId ? { ...current, error } : current), [userId]);
  const setNotifications = useCallback((update: (rows: BuyerNotificationRow[]) => BuyerNotificationRow[]) => setSnapshot((current) => current.owner === userId ? { ...current, rows: update(current.rows) } : current), [userId]);

  const loadNotifications = useCallback(async () => {
    const version = ++requestVersion.current;
    const supabase = createClientSupabaseClient();
    if (!supabase) {
      setSnapshot((current) => ({ owner: userId, rows: current.owner === userId ? current.rows : [], error: "Notifications are unavailable. Please retry.", loaded: true }));
      return;
    }
    try {
      const blockedResult = await supabase.rpc("my_blocked_user_ids");
      if (blockedResult.error) throw blockedResult.error;
      const blocked = normalizeBlockedUserIds(blockedResult.data);
      const { data, error: loadError } = await supabase.from("notifications")
        .select("id,type,title,body,data,read_at,created_at").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(Math.max(limit * 3, 100));
      if (version !== requestVersion.current) return;
      if (loadError) throw loadError;
      const rows = (data ?? []).filter(isVisibleAlertNotification).filter(row => allowsUser(notificationActorUserId(row.data), blocked)).slice(0, limit) as BuyerNotificationRow[];
      const unresolved = rows.filter((row) => isCoordinationNotification(row) && !row.data?.project_id);
      const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
      const roleIds = [...new Set(unresolved.map((row) => row.data?.role_id).filter(uuid))];
      const requestIds = [...new Set(unresolved.filter((row) => row.type === "request_resolved_booking_confirm").map((row) => row.data?.request_id).filter(uuid))];
      const [roles, requests] = await Promise.all([
        roleIds.length ? supabase.from("roles").select("id,project_id").in("id",roleIds) : Promise.resolve({ data: [] }),
        requestIds.length ? supabase.from("booking_confirmation_requests").select("id,booking:bookings(project_id)").in("id",requestIds) : Promise.resolve({ data: [] }),
      ]);
      if (version !== requestVersion.current) return;
      const roleProjects = new Map((roles.data ?? []).map((row) => [row.id, row.project_id]));
      const requestProjects = new Map((requests.data ?? []).map((row) => {
        const booking = Array.isArray(row.booking) ? row.booking[0] : row.booking;
        return [row.id, (booking as { project_id?: string } | null)?.project_id];
      }));
      const resolved = rows.map((row) => {
        if (row.data?.project_id) return row;
        const project = requestProjects.get(String(row.data?.request_id)) ?? roleProjects.get(String(row.data?.role_id));
        return project ? { ...row, data: { ...row.data, project_id: project } } : row;
      });
      setSnapshot({ owner: userId, rows: resolved, error: null, loaded: true });
    } catch {
      if (version === requestVersion.current) setSnapshot((current) => ({ owner: userId, rows: current.owner === userId ? current.rows : [], error: "Could not refresh notifications. Previously loaded updates are still here.", loaded: true }));
    }
  }, [limit, userId]);

  useEffect(() => {
    // Starts external I/O; replies are guarded by account and request generation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNotifications();
    const supabase = createClientSupabaseClient();
    if (!supabase) return () => { requestVersion.current += 1; };
    const channel = supabase.channel(`notifications-${userId}-${limit}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => void loadNotifications())
      .subscribe((status) => { if (status === "SUBSCRIBED") void loadNotifications(); });
    const refresh = () => { if (document.visibilityState === "visible") void loadNotifications(); };
    window.addEventListener("online", refresh);
    window.addEventListener(BLOCKED_USERS_CHANGED_EVENT, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      requestVersion.current += 1;
      window.removeEventListener("online", refresh);
      window.removeEventListener(BLOCKED_USERS_CHANGED_EVENT, refresh);
      document.removeEventListener("visibilitychange", refresh);
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
  }, [notifications, userId, setError, setNotifications]);

  const markRead = useCallback(async (id: string) => {
    const supabase = createClientSupabaseClient();
    if (!supabase) return;
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .eq("id", id);
    if (updateError) return;
    setNotifications((current) =>
      current.map((row) => (row.id === id ? { ...row, read_at: now } : row)),
    );
  }, [userId, setNotifications]);

  return {
    error,
    notifications,
    unreadCount,
    isLoading,
    loadNotifications,
    markAllRead,
    markRead,
  };
}
