"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, ArrowRight, RefreshCw } from "lucide-react";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { moveCastingSelectionsToConfirmations, updateProjectConfirmation } from "@/lib/talent-buyers/confirmations";
import { confirmationCanAct, confirmationLabel, handoffIsCurrent, type ConfirmationData, type ProjectConfirmation } from "@/lib/talent-buyers/confirmation-model";
import { useProjectWorkspace } from "./ProjectWorkspaceContext";
import "./project-confirmations.css";

type Editor = { record: ProjectConfirmation; action: "availability" | "reschedule" | "close"; requestId: string };
function formatDate(date: string) { return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }); }
export function ProjectConfirmationsPanel({ data }: { data: ConfirmationData }) {
  const { projectId } = useProjectWorkspace();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [timeZone, setTimeZone] = useState("UTC");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState("active");
  const [lastGood, setLastGood] = useState(data);
  if (!data.error && data !== lastGood) setLastGood(data);
  const content = data.error ? lastGood : data;
  const past = new Set(["completed", "cancelled", "declined", "unavailable", "released", "removed", "expired"]);
  const records = content.records.filter((record) => filter === "all" || (filter === "past" ? past.has(record.status) : !past.has(record.status)));
  const readyRoles = content.roles.filter((role) => !handoffIsCurrent(role));
  useEffect(() => {
    if (!editor || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [editor, dirty]);
  function close() { if (!pending && (!dirty || window.confirm("Discard these unsent changes?"))) { setEditor(null); setError(null); } }
  function open(record: ProjectConfirmation, action: Editor["action"]) {
    setEditor({ record, action, requestId: crypto.randomUUID() });
    const dates = record.dates.map((item) => item.date).sort();
    setStartDate(dates[0] ?? ""); setEndDate(dates.at(-1) ?? "");
    setTimeZone(record.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    setMessage(""); setDirty(false); setError(null); setNotice("");
  }
  function act(record: ProjectConfirmation, action: "confirm" | "hold" | "release") {
    setError(null); setNotice("");
    startTransition(async () => {
      const result = await updateProjectConfirmation({ projectId, id: record.id, action });
      if (result.error) { setError(result.error); return; }
      setNotice(action === "confirm" ? "Confirmation request sent. Their response will appear here." : action === "hold" ? "Hold placed." : "Hold released.");
      router.refresh();
    });
  }
  function save() {
    if (!editor) return;
    setError(null);
    startTransition(async () => {
      const result = await updateProjectConfirmation({ projectId, id: editor.record.id, action: editor.action, requestId: editor.requestId, dates: { startDate, endDate: endDate || startDate, timeZone, message } });
      if (result.error) { setError(result.error); return; }
      setNotice(editor.action === "close" ? "Coordination closed. Pending requests were cancelled." : "Availability request sent. Their response will appear here.");
      setEditor(null); setDirty(false); router.refresh();
    });
  }
  return <section className="project-confirmations" aria-labelledby="confirmations-title">
    <div className="project-confirmations__heading"><div><p className="project-confirmations__eyebrow">Project coordination</p><h1 id="confirmations-title">Confirmations</h1><p>Move your final selections here, check dates, and get a clear response from each person.</p></div><button className="bd-btn-secondary" onClick={() => router.refresh()} disabled={pending}><RefreshCw size={16} aria-hidden /> Refresh</button></div>
    {data.error ? <div className="project-confirmations__notice" role="alert"><p>{data.error}</p><button className="bd-btn-secondary" onClick={() => router.refresh()}>Try again</button></div> : null}
    {(!data.error || content.records.length > 0 || content.roles.length > 0) && <>
      {readyRoles.length > 0 && <div className="project-confirmations__handoff"><h2>Final selections ready</h2><p>This adds selected Motiion members to this workspace. Send requests when you are ready.</p>{readyRoles.map((role) => <div key={role.id}><span><strong>{role.title}</strong><small>{role.selectedIds.length} selected</small></span><button className="bd-btn-secondary" disabled={pending} onClick={() => { setError(null); startTransition(async () => {
        const result = await moveCastingSelectionsToConfirmations({ projectId, roleId: role.id, expectedIds: role.selectedIds });
        if (result.error) { setError(result.error); return; }
        setNotice(`${result.added ?? 0} added to confirmations.${result.external ? ` ${result.external} external submission${result.external === 1 ? " needs" : "s need"} direct contact; keep their details in internal notes below.` : ""}`); router.refresh();
      }); }}>Move final selections <ArrowRight size={16} aria-hidden /></button></div>)}</div>}
      <div className="project-confirmations__filters"><label>Show <select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="active">Active</option><option value="past">Past</option><option value="all">All people</option></select></label><span>{records.length} {records.length === 1 ? "person" : "people"}</span></div>
      {records.length ? <div className="project-confirmations__grid">{records.map((record) => <article key={record.id} className="project-confirmations__card"><div className="project-confirmations__identity"><CalendarCheck size={20} aria-hidden /><div><h2>{record.talentName}</h2><p>{record.role}</p></div><span className={`project-confirmations__badge ${record.status === "confirmed" ? "is-confirmed" : ""}`}>{confirmationLabel(record)}</span></div>
        <p>{record.dates.length ? <>{formatDate(record.dates[0].date)}{record.dates.length > 1 ? ` – ${formatDate(record.dates.at(-1)!.date)}` : ""}<small>{record.timeZone || "Time zone not set"} · {record.dates.length} {record.dates.length === 1 ? "day" : "days"}</small></> : "Dates to confirm"}</p>
        {record.responseNote && <blockquote>{record.responseNote}</blockquote>}
        {record.confirmationStatus === "declined" && <p>The confirmation was declined. Contact them before requesting again.</p>}
        {record.hasLegacyAgreement ? <p>This historical record contains an agreement. <Link href="/bookings">View the retirement notice</Link>.</p> : confirmationCanAct(record) && <div className="project-confirmations__actions">
          {!record.availabilityRequestId && record.status === "availability" ? <button className="bd-btn-primary" disabled={pending} onClick={() => open(record, "availability")}>Check availability</button> : null}
          {record.confirmationStatus !== "pending" && record.dates.length > 0 && <button className="bd-btn-primary" disabled={pending} onClick={() => act(record, "confirm")}>Request confirmation</button>}
          <button className="bd-btn-secondary" disabled={pending} onClick={() => act(record, record.status === "on_hold" ? "release" : "hold")}>{record.status === "on_hold" ? "Release hold" : "Place hold"}</button>
          {record.availabilityRequestId && <button className="bd-btn-secondary" disabled={pending} onClick={() => open(record, "reschedule")}>Change dates</button>}
          <button className="bd-btn-ghost" disabled={pending} onClick={() => open(record, "close")}>Close</button>
        </div>}
      </article>)}</div> : <div className="project-confirmations__empty"><CalendarCheck size={28} aria-hidden /><h2>{filter === "past" ? "No past confirmations" : "Your selected team belongs here"}</h2><p>{filter === "past" ? "Closed coordination stays available for reference." : "Finalize your casting selections, then move them into confirmations to coordinate dates."}</p><Link className="bd-btn-secondary" href={`/projects/${projectId}/workspace/cast`}>Open final selections</Link></div>}
    </>}
    {notice && <p className="project-confirmations__notice" role="status">{notice}</p>}{error && !editor && <p className="project-confirmations__error" role="alert">{error}</p>}
    <Modal open={Boolean(editor)} onClose={close} placement="drawer" title={editor?.action === "close" ? "Close coordination" : editor?.action === "reschedule" ? "Change dates" : "Check availability"} description={editor?.record.talentName} footer={<><button className="bd-btn-secondary" disabled={pending} onClick={close}>Cancel</button><button className="bd-btn-primary" disabled={pending || (editor?.action !== "close" && !startDate)} onClick={save}>{pending ? "Saving…" : editor?.action === "close" ? "Close coordination" : "Send availability request"}</button></>}>
      {editor?.action === "close" ? <p>Close this unconfirmed coordination and cancel its pending requests. The history will remain available under Past.</p> : <div className="project-confirmations__fields">
        <p>{editor?.action === "reschedule" ? "New dates require a fresh availability response. Previous pending requests will be cancelled." : "Choose the work dates. This sends an availability request to their Motiion inbox."}</p>
        <label>Start date<input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); if (!endDate || endDate < event.target.value) setEndDate(event.target.value); setDirty(true); }} /></label>
        <label>End date<input type="date" min={startDate} value={endDate} onChange={(event) => { setEndDate(event.target.value); setDirty(true); }} /></label>
        <label>Time zone<input value={timeZone} onChange={(event) => { setTimeZone(event.target.value); setDirty(true); }} placeholder="America/Los_Angeles" /></label>
        {editor?.action === "availability" && <label>Message (optional)<textarea rows={4} maxLength={2000} value={message} onChange={(event) => { setMessage(event.target.value); setDirty(true); }} /></label>}
      </div>}
      {error && <p className="project-confirmations__error" role="alert">{error}</p>}
    </Modal>
  </section>;
}
