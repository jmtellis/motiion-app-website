"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarPlus } from "lucide-react";
import { isActiveEnrollment } from "@/lib/app/activity-enrollment";
import { setActivityCalendarSaved, type activityViewerState } from "@/lib/app/activities";

export function ActivityCalendarSave({ activityId, viewer }: { activityId: string; viewer: Awaited<ReturnType<typeof activityViewerState>> }) {
  const router = useRouter();
  const [saved, setSaved] = useState(viewer.saved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(viewer.error);
  const busy = useRef(false);
  async function toggle() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(null);
    try {
      const result = await setActivityCalendarSaved(activityId, !saved);
      if (!result.ok) { setError(result.error ?? "Couldn't update your calendar."); return; }
      setSaved(!saved); router.refresh();
    } catch { setError("Couldn't reach your calendar. Check your connection and retry."); }
    finally { busy.current = false; setPending(false); }
  }
  if (isActiveEnrollment(viewer.enrollmentStatus)) return <p className="mt-4 flex items-center gap-2 text-sm"><CalendarCheck size={18} aria-hidden />Your registration is included in your calendar.</p>;
  return <div className="mt-4 space-y-2">
    {viewer.signedIn ? <button type="button" className="ui-button ui-button--secondary" aria-pressed={saved} disabled={pending} onClick={() => void toggle()}>{saved ? <CalendarCheck size={18} aria-hidden /> : <CalendarPlus size={18} aria-hidden />}{pending ? "Updating calendar…" : saved ? "Saved to calendar · Remove" : "Save to calendar"}</button> : <Link className="ui-button ui-button--secondary" href={`/login?next=${encodeURIComponent(`/activity/${activityId}`)}`}>Sign in to save to calendar</Link>}
    <p className="text-sm opacity-80">Saving adds a reminder to your Motiion calendar. Reserve a spot separately if required.</p>
    {error ? <p role="alert" className="text-sm">{error}</p> : null}
  </div>;
}
