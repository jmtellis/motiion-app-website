"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mergeNotificationPreferences, notificationCategories, notificationSettings, type NotificationSettings } from "@/lib/settings/notification-preferences";

export async function loadNotificationSettings(): Promise<{ ok: true; settings: NotificationSettings } | { ok: false; error: string }> {
  const db = await createServerSupabaseClient();
  if (!db) return { ok: false, error: "Notification settings are temporarily unavailable." };
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to manage notifications." };
  const { data, error } = await db.from("profiles").select("notifications_enabled,notification_preferences").eq("user_id", user.id).single();
  if (error) return { ok: false, error: "Couldn’t load notification settings. Please try again." };
  return { ok: true, settings: notificationSettings(data.notifications_enabled, data.notification_preferences) };
}

export async function saveNotificationSettings(input: NotificationSettings): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input || typeof input.enabled !== "boolean" || !input.preferences || notificationCategories.some(({ key }) => typeof input.preferences[key] !== "boolean")) return { ok: false, error: "Check your notification preferences." };
  const db = await createServerSupabaseClient();
  if (!db) return { ok: false, error: "Notification settings are temporarily unavailable." };
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to manage notifications." };
  const { data, error: readError } = await db.from("profiles").select("notification_preferences").eq("user_id", user.id).single();
  if (readError) return { ok: false, error: "Couldn’t read your current preferences. Please try again." };
  const { error } = await db.from("profiles").update({ notifications_enabled: input.enabled, notification_preferences: mergeNotificationPreferences(data.notification_preferences, input.preferences) }).eq("user_id", user.id).select("user_id").single();
  if (error) return { ok: false, error: "Couldn’t save notification settings. Please try again." };
  revalidatePath("/settings");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
