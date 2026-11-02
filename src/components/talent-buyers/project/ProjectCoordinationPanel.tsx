"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { saveProjectCoordination } from "@/lib/talent-buyers/coordination";
import { coordinationLabels, coordinationStatuses, type CoordinationRecord, type CoordinationInput } from "@/lib/talent-buyers/coordination-schema";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useProjectWorkspace } from "./ProjectWorkspaceContext";
import "./project-bookings.css";

function dateLabel(value: string | null) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Dates to confirm";
}
export function ProjectCoordinationPanel({ initialRecords, storageError }: { initialRecords: CoordinationRecord[]; storageError: string | null }) {
  const { projectId, rosterMembers } = useProjectWorkspace();
  const router = useRouter();
  const [records, setRecords] = useState(initialRecords);
  const [editor, setEditor] = useState<CoordinationInput | null>(null);
  const [savedState, setSavedState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [pending, startTransition] = useTransition();
  const dirty = editor !== null && JSON.stringify(editor) !== savedState;
  const [previousRecords, setPreviousRecords] = useState(initialRecords);
  if (previousRecords !== initialRecords) {
    setPreviousRecords(initialRecords);
    setRecords(initialRecords);
  }
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function edit(record?: CoordinationRecord) {
    const value = record ?? { project_id: projectId, talent_name: "", role: "", status: "draft" as const, start_date: null, end_date: null, negotiation_notes: "" };
    setEditor(value); setSavedState(JSON.stringify(value)); setError(null); setNotice("");
  }
  function close() {
    if (pending || (dirty && !window.confirm("Discard your unsaved changes?"))) return;
    setEditor(null);
  }
  function update<K extends keyof CoordinationInput>(key: K, value: CoordinationInput[K]) {
    setEditor((current) => current ? { ...current, [key]: value } : null);
  }
  function save() {
    if (!editor) return;
    startTransition(async () => {
      try {
        const result = await saveProjectCoordination(editor);
        if (!result.record) { setError(result.error ?? "Could not save."); return; }
        const saved = result.record;
        setRecords((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
        setEditor(null); setError(null); setNotice("Coordination details saved."); router.refresh();
      } catch { setError("Could not save. Your changes are still here; please try again."); }
    });
  }
  const visible = records.filter((record) => filter === "all" || record.status === filter);
  return <section className="project-bookings">
    <div className="project-bookings__heading"><div><h2>Internal notes</h2><p>Track external contacts and private details. These notes do not send requests or confirm talent.</p></div><button onClick={() => edit()} disabled={Boolean(storageError)}><Plus size={16} aria-hidden /> Add person</button></div>
    {storageError && <div role="alert" className="project-bookings__notice"><p>{storageError}</p><button className="secondary" onClick={() => router.refresh()}>Try again</button></div>}
    {notice && <p role="status" className="project-bookings__notice">{notice}</p>}
    <label className="project-coordination__filter">Status <select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All people</option>{coordinationStatuses.map((status) => <option key={status} value={status}>{coordinationLabels[status]}</option>)}</select></label>
    {visible.length ? <div className="project-bookings__panel"><div className="project-bookings__table"><table><thead><tr><th scope="col">Person / role</th><th scope="col">Status</th><th scope="col">Dates</th></tr></thead><tbody>{visible.map((record) => <tr key={record.id}>
      <td><button className="project-bookings__name" onClick={() => edit(record)}>{record.talent_name}</button><small>{record.role || "Role to confirm"}</small></td>
      <td><span className={`project-bookings__status is-${record.status}`}>{coordinationLabels[record.status]}</span></td>
      <td>{dateLabel(record.start_date)}{record.end_date && record.end_date !== record.start_date ? ` – ${dateLabel(record.end_date)}` : ""}</td>
    </tr>)}</tbody></table></div></div> : !storageError && <div className="project-bookings__empty"><h3>{records.length ? "No people in this stage" : "Keep the next step clear"}</h3><p>{records.length ? "Choose another status to see your team." : "Add the people you are coordinating with, then record roles, dates, and internal notes. Availability requests and messages stay in your inbox."}</p><button onClick={() => records.length ? setFilter("all") : edit()}>{records.length ? "Show all people" : "Add a person"}</button></div>}
    <Modal open={Boolean(editor)} onClose={close} title={editor?.id ? "Edit coordination" : "Add a person"} description="Internal project details. Saving does not send a message or an availability request." placement="drawer"
      footer={<><button className="bd-btn-secondary" disabled={pending} onClick={close}>Cancel</button><button className="bd-btn-accent" form="project-coordination-form" type="submit" disabled={pending || !editor?.talent_name.trim() || !dirty}>{pending ? "Saving…" : "Save details"}</button></>}>
      {editor && <form id="project-coordination-form" onSubmit={(event) => { event.preventDefault(); save(); }}><fieldset disabled={pending} className="project-bookings__fields">
        <label>Person<input autoFocus required list="coordination-roster" value={editor.talent_name} onChange={(event) => update("talent_name", event.target.value)} maxLength={200} autoComplete="off" /><datalist id="coordination-roster">{rosterMembers.map((member) => <option key={member.id} value={member.name} />)}</datalist></label>
        <label>Role<input value={editor.role} onChange={(event) => update("role", event.target.value)} maxLength={200} placeholder="e.g. Lead dancer" /></label>
        <label>Status<select value={editor.status} onChange={(event) => update("status", event.target.value as CoordinationInput["status"])}>{coordinationStatuses.map((status) => <option key={status} value={status}>{coordinationLabels[status]}</option>)}</select></label>
        <label>Start date<input type="date" value={editor.start_date ?? ""} onChange={(event) => update("start_date", event.target.value || null)} /></label>
        <label>End date<input type="date" min={editor.start_date ?? undefined} value={editor.end_date ?? ""} onChange={(event) => update("end_date", event.target.value || null)} /></label>
        <label className="project-coordination__notes">Internal notes<textarea rows={8} maxLength={20000} value={editor.negotiation_notes} onChange={(event) => update("negotiation_notes", event.target.value)} placeholder="Next steps, call times, and details for your team…" /></label>
      </fieldset>{error && <p className="project-bookings__error" role="alert">{error}</p>}</form>}
    </Modal>
  </section>;
}
