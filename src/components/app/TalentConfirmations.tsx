"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { confirmationLabel, confirmationScope } from "@/lib/talent-buyers/confirmation-model";
import type { TalentConfirmationData } from "@/lib/app/talent-confirmations";
import "@/components/talent-buyers/project/project-confirmations.css";
import { ProductEmptyState } from "@/components/ui/EmptyState";

export function TalentConfirmations({ data, initialBooking = null }: { data: TalentConfirmationData; initialBooking?: string | null }) {
  const router = useRouter();
  const target = data.records.find((record) => record.id === initialBooking);
  const [scopeOverride, setScope] = useState<"active" | "past" | null>(null);
  const scope = scopeOverride ?? (target ? confirmationScope(target) : "active");
  const selectedRef = useRef<HTMLElement>(null);
  const records = data.records.filter((record) => confirmationScope(record) === scope);
  useEffect(() => { selectedRef.current?.focus({ preventScroll: false }); }, [initialBooking, target?.id]);
  return <section className="project-confirmations" aria-label="Your project confirmations">
    <div className="project-confirmations__heading"><div><h2>Your project confirmations</h2><p>Keep track of selected projects, work dates, and your responses.</p></div><Link href="/inbox?filter=requests" className="ui-btn ui-btn--secondary">Review requests</Link></div>
    {initialBooking && !target && !data.error && <p role="status">This confirmation is no longer available. Your other project updates are below.</p>}
    {data.error ? <div role="alert" className="project-confirmations__notice"><p>{data.error}</p><button className="ui-btn ui-btn--secondary" onClick={() => router.refresh()}>Try again</button></div> : <>
      <div className="home-browser__filters" role="group" aria-label="Confirmation status"><button aria-pressed={scope === "active"} onClick={() => setScope("active")}>Active</button><button aria-pressed={scope === "past"} onClick={() => setScope("past")}>Past</button></div>
      {records.length ? <div className="project-confirmations__grid">{records.map((record) => <article key={record.id} ref={record.id === initialBooking ? selectedRef : undefined} tabIndex={record.id === initialBooking ? -1 : undefined} data-highlighted={record.id === initialBooking || undefined} className="project-confirmations__card"><div className="project-confirmations__identity"><CalendarCheck size={20} aria-hidden /><div><h3>{record.projectTitle}</h3><p>{record.role}</p></div><span className={`project-confirmations__badge ${record.status === "confirmed" ? "is-confirmed" : ""}`}>{confirmationLabel(record)}</span></div>
        <p>{record.dates.length ? record.dates.map((item) => new Date(`${item.date}T12:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })).join(" · ") : "Dates to confirm"}{record.timeZone && <small>{record.timeZone}</small>}</p>
        {record.responseNote && <blockquote>Your note: {record.responseNote}</blockquote>}
        {record.hasLegacyAgreement ? <Link href="/deal-memos">About previous agreements</Link> : record.confirmationStatus === "pending" || record.availabilityStatus === "pending" ? <Link href="/inbox?filter=requests" className="ui-btn ui-btn--primary">Review request</Link> : record.status === "confirmed" ? <Link href="/schedule" className="ui-btn ui-btn--secondary">View schedule</Link> : <p>{scope === "past" ? "This coordination is closed." : "You will see new requests in your inbox."}</p>}
      </article>)}</div> : <ProductEmptyState illustration="events" title={scope === "past" ? "No past confirmations" : "No project confirmations yet"} description="When a casting team moves you into project coordination, you can follow its status here." actionLabel="Browse open calls" actionHref="/opportunities" />}
    </>}
  </section>;
}
