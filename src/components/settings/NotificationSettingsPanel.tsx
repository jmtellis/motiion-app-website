"use client";

import { useState } from "react";
import { notificationCategories, type NotificationSettings } from "@/lib/settings/notification-preferences";
import { saveNotificationSettings } from "@/app/settings/notification-actions";

export function NotificationSettingsPanel({ initial, community = false }: { initial: NotificationSettings; community?: boolean }) {
  const [settings, setSettings] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const dirty = JSON.stringify(saved) !== JSON.stringify(settings);
  async function save() {
    setPending(true); setError(null); setSuccess(false);
    try {
      const result = await saveNotificationSettings(settings);
      if (!result.ok) { setError(result.error); return; }
      setSaved(settings); setSuccess(true);
    } catch { setError("Couldn’t save your preferences. Check your connection and try again."); }
    finally { setPending(false); }
  }
  return <section className="space-y-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 text-[var(--ui-text)]" aria-labelledby="notification-settings-title">
    <h2 id="notification-settings-title" className="text-lg font-semibold">Notifications</h2>
    <p className="text-sm text-[var(--ui-muted)]">These preferences are shared with the Motiion app. Essential schedule and confirmation updates may still appear.</p>
    <fieldset disabled={pending} className="space-y-2">
      <legend className="sr-only">Notification categories</legend>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 font-medium"><input className="size-5 accent-[var(--ui-accent)]" type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} />Motiion notifications</label>
      {notificationCategories.filter((row) => !community || row.community).map(({ key, label }) => <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3"><input className="size-5 accent-[var(--ui-accent)]" type="checkbox" disabled={!settings.enabled} checked={settings.preferences[key]} onChange={(event) => setSettings({ ...settings, preferences: { ...settings.preferences, [key]: event.target.checked } })} />{label}</label>)}
    </fieldset>
    {error ? <p className="ui-notice" data-tone="error" role="alert">{error}</p> : null}
    {success && !dirty ? <p className="ui-notice" data-tone="success" role="status">Notification preferences saved.</p> : null}
    <button type="button" className="ui-button" disabled={pending || !dirty} onClick={save}>{pending ? "Saving…" : "Save preferences"}</button>
  </section>;
}
