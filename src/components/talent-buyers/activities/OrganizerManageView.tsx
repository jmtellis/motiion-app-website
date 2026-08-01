"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  Camera,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Link2,
  MapPin,
  Plus,
  Search,
  Users,
} from "lucide-react";

import {
  grantOrganizerComp,
  inviteSubgroupLead,
  recordOrganizerCheckIn,
  removeSubgroupLead,
  saveOrganizerPromos,
} from "@/app/(buyer-app)/(paid)/calendar/organizer-actions";
import { ActivityPeoplePicker } from "@/components/talent-buyers/activities/ActivityPeoplePicker";
import { BuyerCoverImage } from "@/components/talent-buyers/dashboard/BuyerCoverImage";
import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import { createDefaultPromoCode } from "@/lib/talent-buyers/activities/defaults";
import type { OrganizerActivityDetail } from "@/lib/talent-buyers/activities/organizer-data";
import type {
  DraftPersonRef,
  DraftPromoCode,
  OrganizerAttendee,
  OrganizerLeadStatus,
  OrganizerRevenueSummary,
  OrganizerSubgroup,
} from "@/lib/talent-buyers/activities/types";
import { formatMoney } from "@/lib/publicActivity";

import "@/components/talent-buyers/project/project-workspace.css";

type Tab = "overview" | "guests" | "checkin" | "leads" | "promos" | "revenue";

function ActivityCoverAvatar({ src }: { src: string | null }) {
  return (
    <span className="buyer-chrome-bar__cover-avatar buyer-chrome-bar__cover-avatar--large" aria-hidden>
      <BuyerCoverImage src={src} alt="" fill allowStockFallback={false} />
    </span>
  );
}

function ActivityChromeEnd({
  activityId,
  publicPath,
  onCopy,
}: {
  activityId: string;
  publicPath: string;
  onCopy: () => void;
}) {
  return (
    <>
      <button type="button" className="buyer-chrome-bar__edit-link gap-1.5" onClick={onCopy}>
        <Copy className="size-3.5" aria-hidden />
        Copy link
      </button>
      <Link href={`/calendar/${activityId}/edit`} className="buyer-chrome-bar__edit-link">
        Edit
      </Link>
      <Link
        href={publicPath}
        className="buyer-chrome-bar__edit-link gap-1.5"
        target="_blank"
        rel="noreferrer"
      >
        Public page
        <ExternalLink className="size-3.5" aria-hidden />
      </Link>
    </>
  );
}

function activityChromeLede(activity: OrganizerActivityDetail) {
  const parts: string[] = [];
  if (activity.location?.trim()) parts.push(activity.location.trim());
  if (activity.activityDate) {
    const dateLabel = new Date(`${activity.activityDate}T12:00:00`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    parts.push(dateLabel);
  }
  if (parts.length === 0) {
    return activity.type.charAt(0).toUpperCase() + activity.type.slice(1);
  }
  return parts.join(" · ");
}

function leadStatusLabel(status: OrganizerLeadStatus): string {
  switch (status) {
    case "pending_invite":
      return "Invite pending";
    case "accepted_setup_incomplete":
      return "Accepted — setup in app";
    case "child_event_linked":
      return "Child event linked";
    default:
      return status;
  }
}

export function OrganizerManageView({
  activity,
  attendees,
  revenue,
  subgroups,
  promos: initialPromos,
  initialTab,
}: {
  activity: OrganizerActivityDetail;
  attendees: OrganizerAttendee[];
  revenue: OrganizerRevenueSummary;
  subgroups: OrganizerSubgroup[];
  promos: DraftPromoCode[];
  initialTab?: Tab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab ?? "overview");
  const [eventDayId, setEventDayId] = useState<string | null>(
    activity.eventDays[0]?.id ?? null,
  );
  const [manualRef, setManualRef] = useState("");
  const [guestQuery, setGuestQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [scanning, setScanning] = useState(false);
  const [promos, setPromos] = useState(initialPromos);
  const [leadInviteGroupId, setLeadInviteGroupId] = useState<string | null>(
    subgroups[0]?.id ?? null,
  );
  const [leadInvitees, setLeadInvitees] = useState<DraftPersonRef[]>([]);
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

  const filteredConfirmed = useMemo(() => {
    const q = guestQuery.trim().toLowerCase();
    if (!q) return confirmed;
    return confirmed.filter(
      (row) =>
        row.displayName.toLowerCase().includes(q) ||
        (row.ticketLabel ?? "").toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q),
    );
  }, [confirmed, guestQuery]);

  const publicPath =
    activity.type === "class"
      ? `/class/${activity.id}`
      : activity.type === "session"
        ? `/session/${activity.id}`
        : `/event/${activity.id}`;

  const chromeLede = activityChromeLede(activity);

  useRegisterBuyerChrome({
    leading: <ActivityCoverAvatar src={activity.coverImageUrl} />,
    title: activity.title || "Untitled activity",
    lede: chromeLede,
    breadcrumbs: [],
    end: (
      <ActivityChromeEnd
        activityId={activity.id}
        publicPath={publicPath}
        onCopy={() => {
          const url =
            typeof window !== "undefined"
              ? `${window.location.origin}${publicPath}`
              : publicPath;
          void navigator.clipboard.writeText(url);
          setMessage("Public link copied.");
        }}
      />
    ),
    revision: `${activity.id}:${activity.title}:${activity.coverImageUrl ?? ""}:${chromeLede}`,
  });

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

  function exportCsv() {
    const header = ["Name", "Status", "Ticket", "Checked in"];
    const lines = confirmed.map((row) =>
      [
        row.displayName,
        row.status,
        row.ticketLabel ?? "",
        row.checkedInAt ?? "",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activity.title || "attendees"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "guests", label: "Guests" },
    { id: "checkin", label: "Check-in" },
    ...(activity.type === "event" ? [{ id: "leads" as const, label: "Leads" }] : []),
    ...(activity.requirePayment ? [{ id: "promos" as const, label: "Promos" }] : []),
    { id: "revenue", label: "Revenue" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm text-white/55">
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
        {activity.requirePayment ? (
          <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-2.5 py-0.5 text-xs text-[var(--accent)]">
            Ticketed
          </span>
        ) : null}
      </div>

      <div className="project-workspace-tabs activity-manage-tabs">
        <div className="project-workspace-tabs__scroller" role="tablist" aria-label="Activity sections">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`project-workspace-tabs__tab ${
                  active ? "project-workspace-tabs__tab--active" : ""
                }`}
              >
                <span className="project-workspace-tabs__label">{item.label}</span>
                {active ? <span className="project-workspace-tabs__underline" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {message ? (
        <p className="inline-flex items-center gap-2 text-sm text-[var(--accent)]">
          <CheckCircle2 className="size-4" />
          {message}
        </p>
      ) : null}
      {error ? <p className="text-sm text-amber-300">{error}</p> : null}

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
          <div className="bd-muted-panel md:col-span-3 space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Details</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="bd-btn-secondary gap-1.5"
                  onClick={() => setTab("checkin")}
                >
                  <Link2 className="size-3.5" />
                  Open check-in
                </button>
                <a href={publicPath} className="bd-btn-secondary gap-1.5" target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5" />
                  Share page
                </a>
              </div>
            </div>
            <p className="text-sm text-white/60 whitespace-pre-wrap">
              {activity.description || "No description yet."}
            </p>
            {activity.eventDays.length ? (
              <div className="space-y-2">
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
              <input
                value={guestQuery}
                onChange={(event) => setGuestQuery(event.target.value)}
                placeholder="Search guests"
                className="w-full rounded-full border border-white/12 bg-black/30 py-2.5 pl-10 pr-3.5 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
            <button type="button" className="bd-btn-secondary gap-1.5" onClick={exportCsv}>
              <Download className="size-3.5" />
              Export CSV
            </button>
          </div>
          <GuestList
            title="Confirmed"
            rows={filteredConfirmed}
            showActions
            ticketOptions={activity.ticketOptions}
            onComp={(userId, ticketOptionId) => {
              setError(null);
              setMessage(null);
              startTransition(async () => {
                const result = await grantOrganizerComp({
                  activityId: activity.id,
                  userId,
                  ticketOptionId,
                });
                if (!result.ok) {
                  setError(result.error ?? "Could not comp guest.");
                  return;
                }
                setMessage("Guest marked as comped.");
                router.refresh();
              });
            }}
            isPending={isPending}
          />
          <GuestList title="Invited / pending" rows={invited} />
        </div>
      ) : null}

      {tab === "checkin" ? (
        <div className="space-y-4">
          {activity.eventDays.length > 1 ? (
            <label className="block space-y-1 text-sm text-white/60">
              Check-in day
              <select
                className="mt-1 w-full rounded-full border border-white/12 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-white/30"
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
              className="w-full rounded-full border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/30"
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

          <GuestList title="Roster status" rows={confirmed} showCheckIn />
        </div>
      ) : null}

      {tab === "leads" ? (
        <div className="space-y-6">
          <div className="bd-muted-panel space-y-2 p-5 text-sm text-white/60">
            <p className="font-semibold text-white">Subgroup leads</p>
            <p>
              Leads facilitate their own private satellite event for this showcase in the Motiion
              app. Invite them here; they accept and finish setup on mobile.
            </p>
          </div>

          {subgroups.length === 0 ? (
            <div className="bd-muted-panel p-5 text-sm text-white/55">
              No subgroups yet.{" "}
              <Link href={`/calendar/${activity.id}/edit`} className="text-[var(--accent)] underline">
                Edit the event
              </Link>{" "}
              to enable subgroups and invite leads.
            </div>
          ) : (
            subgroups.map((group) => (
              <div key={group.id} className="space-y-3">
                <h2 className="text-sm font-semibold text-white">{group.name}</h2>
                {group.leads.length === 0 ? (
                  <p className="text-sm text-white/45">No leads invited yet.</p>
                ) : (
                  <ul className="divide-y divide-white/8 rounded-2xl border border-white/10">
                    {group.leads.map((lead) => (
                      <li
                        key={`${lead.groupId}-${lead.userId ?? lead.inviteId}`}
                        className="flex flex-wrap items-center gap-3 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {lead.displayName}
                          </p>
                          <p className="text-xs text-white/45">{leadStatusLabel(lead.status)}</p>
                          {lead.subgroupActivityId ? (
                            <Link
                              href={`/calendar/${lead.subgroupActivityId}`}
                              className="text-xs text-[var(--accent)]"
                            >
                              {lead.subgroupActivityTitle ?? "View child event"}
                            </Link>
                          ) : null}
                        </div>
                        {lead.userId ? (
                          <button
                            type="button"
                            className="bd-btn-secondary"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                const result = await removeSubgroupLead({
                                  activityId: activity.id,
                                  groupId: group.id,
                                  userId: lead.userId!,
                                });
                                if (!result.ok) {
                                  setError(result.error ?? "Could not remove lead.");
                                  return;
                                }
                                setMessage("Lead removed.");
                                router.refresh();
                              });
                            }}
                          >
                            Remove
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}

          {subgroups.length > 0 ? (
            <div className="bd-muted-panel space-y-3 p-5">
              <p className="text-sm font-semibold text-white">Invite another lead</p>
              <label className="block text-sm text-white/55">
                Subgroup
                <select
                  className="mt-1 w-full rounded-full border border-white/12 bg-black/30 px-3 py-2.5 text-white outline-none"
                  value={leadInviteGroupId ?? ""}
                  onChange={(event) => setLeadInviteGroupId(event.target.value || null)}
                >
                  {subgroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <ActivityPeoplePicker
                label="Lead"
                selected={leadInvitees}
                onChange={setLeadInvitees}
                emptyHint="Search for a Motiion user to invite as lead."
              />
              <button
                type="button"
                className="bd-btn-accent"
                disabled={isPending || !leadInviteGroupId || leadInvitees.length === 0}
                onClick={() => {
                  const person = leadInvitees[0];
                  if (!person || !leadInviteGroupId) return;
                  startTransition(async () => {
                    const result = await inviteSubgroupLead({
                      activityId: activity.id,
                      groupId: leadInviteGroupId,
                      userId: person.userId,
                    });
                    if (!result.ok) {
                      setError(result.error ?? "Could not invite lead.");
                      return;
                    }
                    setLeadInvitees([]);
                    setMessage("Lead invited.");
                    router.refresh();
                  });
                }}
              >
                Send invite
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "promos" ? (
        <div className="space-y-4">
          <p className="text-sm text-white/55">
            Motiion promo codes discount the ticket price before Checkout. Each code is synced to
            Stripe for audit.
          </p>
          {promos.map((promo, index) => (
            <div key={promo.id} className="bd-muted-panel grid gap-3 p-5 sm:grid-cols-2">
              <label className="text-sm text-white/55">
                Code
                <input
                  className="mt-1 w-full rounded-full border border-white/12 bg-black/30 px-3 py-2 text-white"
                  value={promo.code}
                  onChange={(event) => {
                    const next = [...promos];
                    next[index] = { ...promo, code: event.target.value.toUpperCase() };
                    setPromos(next);
                  }}
                />
              </label>
              <label className="text-sm text-white/55">
                Type
                <select
                  className="mt-1 w-full rounded-full border border-white/12 bg-black/30 px-3 py-2 text-white"
                  value={promo.discountType}
                  onChange={(event) => {
                    const next = [...promos];
                    next[index] = {
                      ...promo,
                      discountType:
                        event.target.value === "fixed_cents" ? "fixed_cents" : "percent",
                    };
                    setPromos(next);
                  }}
                >
                  <option value="percent">Percent</option>
                  <option value="fixed_cents">Fixed $</option>
                </select>
              </label>
              <label className="text-sm text-white/55">
                Value
                <input
                  type="number"
                  className="mt-1 w-full rounded-full border border-white/12 bg-black/30 px-3 py-2 text-white"
                  value={promo.discountValue}
                  onChange={(event) => {
                    const next = [...promos];
                    next[index] = { ...promo, discountValue: Number(event.target.value) || 0 };
                    setPromos(next);
                  }}
                />
              </label>
              <label className="inline-flex items-center gap-2 self-end text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={promo.isActive}
                  onChange={(event) => {
                    const next = [...promos];
                    next[index] = { ...promo, isActive: event.target.checked };
                    setPromos(next);
                  }}
                />
                Active
              </label>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="bd-btn-secondary gap-1.5"
              onClick={() => setPromos([...promos, createDefaultPromoCode()])}
            >
              <Plus className="size-4" />
              Add code
            </button>
            <button
              type="button"
              className="bd-btn-accent"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await saveOrganizerPromos({
                    activityId: activity.id,
                    promos,
                  });
                  if (!result.ok) {
                    setError(result.error ?? "Could not save promos.");
                    return;
                  }
                  setMessage("Promo codes saved.");
                  router.refresh();
                });
              }}
            >
              {isPending ? "Saving…" : "Save promos"}
            </button>
          </div>
        </div>
      ) : null}

      {tab === "revenue" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Paid tickets" value={String(revenue.paidCount)} />
          <StatCard
            label="Gross ticket sales"
            value={formatMoney(revenue.grossCents, revenue.currency)}
          />
          <StatCard label="Promo redemptions" value={String(revenue.promoRedemptionCount)} />
          <div className="bd-muted-panel md:col-span-3 p-5 text-sm text-white/55">
            You receive the listed ticket price. Guests pay ticket + Motiion platform fee + estimated
            card processing. Payouts settle through your Stripe Connect account.
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
  showActions = false,
  ticketOptions = [],
  onComp,
  isPending = false,
}: {
  title: string;
  rows: OrganizerAttendee[];
  showCheckIn?: boolean;
  showActions?: boolean;
  ticketOptions?: { id: string; label: string }[];
  onComp?: (userId: string, ticketOptionId?: string | null) => void;
  isPending?: boolean;
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
                    row.checkedInAt ? "text-[var(--accent)]" : "text-white/35"
                  }`}
                >
                  {row.checkedInAt ? "Arrived" : "Not in"}
                </span>
              ) : null}
              {showActions && row.status !== "comped" && onComp ? (
                <button
                  type="button"
                  className="bd-btn-secondary"
                  disabled={isPending}
                  onClick={() => onComp(row.userId, ticketOptions[0]?.id ?? null)}
                >
                  Comp
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
