"use client";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { confirmationLabel, confirmationScope } from "@/lib/talent-buyers/confirmation-model";
import type { TalentConfirmation } from "@/lib/app/talent-confirmations";
import "@/components/talent-buyers/project/project-confirmations.css";
import { useNotificationsPanel } from "@/components/workspace/WorkspaceNotifications";

export function ConfirmationCard({ record }: { record: TalentConfirmation }) {
  const notifications = useNotificationsPanel();
  const past = confirmationScope(record) === "past";
  return <article className="project-confirmations__card">
    <div className="project-confirmations__identity"><CalendarCheck size={20} aria-hidden /><div><h3>{record.projectTitle}</h3><p>{record.role}</p></div><span className={`project-confirmations__badge ${record.status === "confirmed" ? "is-confirmed" : ""}`}>{confirmationLabel(record)}</span></div>
    <p>{record.dates.length ? record.dates.map((item) => new Date(`${item.date}T12:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })).join(" · ") : "Dates to confirm"}{record.timeZone && <small>{record.timeZone}</small>}</p>
    {record.responseNote && <blockquote>Your note: {record.responseNote}</blockquote>}
    {record.hasLegacyAgreement ? <Link href="/deal-memos">About previous agreements</Link> : record.confirmationStatus === "pending" || record.availabilityStatus === "pending" ? <button type="button" className="ui-btn ui-btn--primary" onClick={() => notifications.setOpen(true)}>Review request</button> : record.status === "confirmed" ? <Link href="/schedule" className="ui-btn ui-btn--secondary">View schedule</Link> : <p>{past ? "This coordination is closed." : "You will see new requests in your notifications."}</p>}
  </article>;
}
