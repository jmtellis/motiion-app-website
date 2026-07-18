"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2, ExternalLink, MapPin, Users } from "lucide-react";

import { recordOrganizerCheckIn } from "@/app/(buyer-app)/(paid)/calendar/organizer-actions";
import type { OrganizerActivityDetail } from "@/lib/talent-buyers/activities/organizer-data";
import type {
  OrganizerAttendee,
  OrganizerRevenueSummary,
} from "@/lib/talent-buyers/activities/types";
import { formatMoney } from "@/lib/publicActivity";

type Tab = "overview" | "guests" | "checkin" | "revenue";

export function OrganizerManageView({
  activity,
  attendees,
  revenue,
}: {
  activity: OrganizerActivityDetail;
  attendees: OrganizerAttendee[];
  revenue: OrganizerRevenueSummary;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [eventDayId, setEventDayId] = useState<string | null>(
    activity.eventDays[0]?.id ?? null,
  );
  const [manualRef, setManualRef] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  const confirmed = useMemo(
    () => attendees.filter((row) => ["paid", "guest", "comped"].includes(row.status)),
    [attendees],
  );
  const invited = useMemo(
    () => attendees.filter((row) => row.status === "invited" || row.status === "pending"),
    [attendees],
  );
  const checkedInCount = confirmed.filter((row) => row.checkedInAt).length;

  const publicPath =
    activity.type === "class"
      ? `/class/${activity.id}`
      : activity.type === "session"
        ? `/session/${activity.id}`
        : `/event/${activity.id}`;

  function submitCheckIn(raw: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await recordOrganizerCheckIn({
        activityId: activity.id,
        qrOrUserRef: raw,
        eventDayId: activity.type === "event" ? eventDayId : null,
      });
      if (!result.ok) {
        setError(result.error ?? "Check-in failed.");
        return;
      }
      setMessage("Checked in successfully.");
      setManualRef("");
      router.refresh();
    });
  }

  async function startScanner() {
    setError(null);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const Detector =
        typeof window !== "undefined"
          ? (
              window as unknown as {
                BarcodeDetector?: new (options: { formats: string[] }) => {
                  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
                };
              }
            ).BarcodeDetector
          : undefined;

      if (!Detector || !videoRef.current) {
        setError("Camera ready — paste or type a profile QR/link below if scan isn’t supported.");
        return;
      }

      const detector = new Detector({ formats: ["qr_code"] });
      const tick = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes[0]?.rawValue;
          if (value) {
            stopScanner();
            submitCheckIn(value);
            return;
          }
        } catch {
          // keep scanning
        }
        scanLoopRef.current = window.setTimeout(() => {
          void tick();
        }, 350);
      };
      void tick();
    } catch {
      setScanning(false);
      setError("Could not open the camera. Use manual check-in instead.");
    }
  }

  function stopScanner() {
    setScanning(false);
    if (scanLoopRef.current) {
      window.clearTimeout(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "guests", label: "Guests" },
    { id: "checkin", label: "Check-in" },
    { id: "revenue", label: "Revenue" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
            {activity.type}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-white">{activity.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/55">
            {activity.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {activity.location}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" />
              {confirmed.length} confirmed
              {activity.maxAttendees != null ? ` / ${activity.maxAttendees}` : ""}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/calendar/${activity.id}/edit`} className="bd-btn-secondary">
            Edit
          </Link>
          <Link href={publicPath} className="bd-btn-secondary gap-1.5" target="_blank">
            Public page
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              tab === item.id
                ? "bg-[#2dd4bf]/15 text-[#2dd4bf]"
                : "text-white/55 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Confirmed" value={String(confirmed.length)} />
          <StatCard label="Checked in" value={String(checkedInCount)} />
          <StatCard
            label="Spots left"
            value={
              activity.spotsRemaining != null ? String(activity.spotsRemaining) : "Open"
            }
          />
          <div className="bd-muted-panel md:col-span-3 p-5">
            <p className="text-sm font-semibold text-white">Details</p>
            <p className="mt-2 text-sm text-white/60 whitespace-pre-wrap">
              {activity.description || "No description yet."}
            </p>
            {activity.eventDays.length ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                  Event days
                </p>
                {activity.eventDays.map((day) => (
                  <p key={day.id} className="text-sm text-white/70">
                    {day.label || day.dayDate} · {(day.startTime ?? "").slice(0, 5)}–
                    {(day.endTime ?? "").slice(0, 5)}
                    {day.maxAttendees != null
                      ? ` · ${day.spotsRemaining ?? day.maxAttendees}/${day.maxAttendees}`
                      : ""}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "guests" ? (
        <div className="space-y-6">
          <GuestList title="Confirmed" rows={confirmed} />
          <GuestList title="Invited / pending" rows={invited} />
        </div>
      ) : null}

      {tab === "checkin" ? (
        <div className="space-y-4">
          {activity.eventDays.length > 1 ? (
            <label className="block space-y-1 text-sm text-white/60">
              Check-in day
              <select
                className="mt-1 w-full rounded-xl border border-white/12 bg-black/30 px-3 py-2.5 text-white"
                value={eventDayId ?? ""}
                onChange={(event) => setEventDayId(event.target.value || null)}
              >
                {activity.eventDays.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.label || day.dayDate}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="bd-muted-panel space-y-3 p-5">
            <p className="text-sm font-semibold text-white">Scan profile QR</p>
            <p className="text-sm text-white/55">
              Guests show their Motiion profile QR (`motiion.app/profile/...`).
            </p>
            {scanning ? (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  className="aspect-video w-full rounded-xl bg-black object-cover"
                  muted
                  playsInline
                />
                <button type="button" className="bd-btn-secondary" onClick={stopScanner}>
                  Stop camera
                </button>
              </div>
            ) : (
              <button type="button" className="bd-btn-accent gap-1.5" onClick={() => void startScanner()}>
                <Camera className="size-4" />
                Open camera
              </button>
            )}
          </div>

          <div className="bd-muted-panel space-y-3 p-5">
            <p className="text-sm font-semibold text-white">Manual check-in</p>
            <input
              value={manualRef}
              onChange={(event) => setManualRef(event.target.value)}
              placeholder="Profile URL, username, or user ID"
              className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white"
            />
            <button
              type="button"
              className="bd-btn-accent"
              disabled={isPending || !manualRef.trim()}
              onClick={() => submitCheckIn(manualRef)}
            >
              {isPending ? "Checking in…" : "Mark arrived"}
            </button>
          </div>

          {message ? (
            <p className="inline-flex items-center gap-2 text-sm text-[#2dd4bf]">
              <CheckCircle2 className="size-4" />
              {message}
            </p>
          ) : null}
          {error ? <p className="text-sm text-amber-300">{error}</p> : null}

          <GuestList title="Roster status" rows={confirmed} showCheckIn />
        </div>
      ) : null}

      {tab === "revenue" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Paid tickets" value={String(revenue.paidCount)} />
          <StatCard
            label="Gross ticket sales"
            value={formatMoney(revenue.grossCents, revenue.currency)}
          />
          <StatCard
            label="Payment mode"
            value={activity.requirePayment ? "Paid" : "Free"}
          />
          <div className="bd-muted-panel md:col-span-3 p-5 text-sm text-white/55">
            Gross is the sum of paid enrollments before platform/processing fees. Payouts settle
            through your Stripe Connect account.
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bd-muted-panel p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function GuestList({
  title,
  rows,
  showCheckIn = false,
}: {
  title: string;
  rows: OrganizerAttendee[];
  showCheckIn?: boolean;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-white">
        {title} ({rows.length})
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-white/45">No guests yet.</p>
      ) : (
        <ul className="divide-y divide-white/8 rounded-2xl border border-white/10">
          {rows.map((row) => (
            <li key={`${row.source}-${row.userId}`} className="flex items-center gap-3 px-4 py-3">
              {row.headshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.headshotUrl}
                  alt=""
                  className="size-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-9 items-center justify-center rounded-full bg-white/10 text-xs text-white/70">
                  {row.displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{row.displayName}</p>
                <p className="text-xs text-white/45">
                  {row.status}
                  {row.ticketLabel ? ` · ${row.ticketLabel}` : ""}
                </p>
              </div>
              {showCheckIn ? (
                <span
                  className={`text-xs font-medium ${
                    row.checkedInAt ? "text-[#2dd4bf]" : "text-white/35"
                  }`}
                >
                  {row.checkedInAt ? "Arrived" : "Not in"}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
