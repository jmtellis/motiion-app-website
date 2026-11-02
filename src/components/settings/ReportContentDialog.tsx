"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { reportContent } from "@/app/settings/moderation-actions";
import { reportReasons, type ContentReportInput, type ContentReportTarget } from "@/lib/settings/content-report";

export function ReportContentDialog({ open, target, onClose }: { open: boolean; target: ContentReportTarget; onClose: () => void }) {
  return open ? <ReportForm key={`${target.contentType}:${target.contentId}:${target.reportedUserId}`} target={target} onClose={onClose} /> : null;
}
function ReportForm({ target, onClose }: { target: ContentReportTarget; onClose: () => void }) {
  const titleId = useId();
  const [reason, setReason] = useState<ContentReportInput["reason"]>("spam");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function close() { if (pending) return; if (!sent && (details.trim() || reason !== "spam")) setDiscarding(true); else onClose(); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError(null);
    try {
      const result = await reportContent({ contentType: target.contentType, contentId: target.contentId, reportedUserId: target.reportedUserId, reason, details });
      if (result.ok) setSent(true); else setError(result.error);
    } catch { setError("Couldn’t send your report. Check your connection and try again."); }
    finally { setPending(false); }
  }
  return <Dialog open onClose={close} labelledBy={titleId}><div className="ui-dialog-panel">
    <header className="ui-dialog-header"><h2 id={titleId}>{sent ? "Report sent" : `Report ${target.displayName}`}</h2><button type="button" className="ui-icon-button" disabled={pending} onClick={close} aria-label="Close report"><X size={18} /></button></header>
    <div className="ui-dialog-body">
      {sent ? <div className="space-y-4"><p role="status">Thanks. Your report has been sent to the Motiion moderation team.</p><button type="button" className="ui-button" onClick={onClose}>Done</button></div> : <form onSubmit={submit} className="space-y-4">
        <Field label="Reason"><select value={reason} disabled={pending} onChange={(event) => setReason(event.target.value as ContentReportInput["reason"])}>{reportReasons.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></Field>
        <Field label={reason === "other" ? "What happened?" : "Details (optional)"} hint="Share the information the team needs to review this report."><textarea value={details} maxLength={2000} required={reason === "other"} disabled={pending} onChange={(event) => setDetails(event.target.value)} /></Field>
        {error ? <p className="ui-notice" data-tone="error" role="alert">{error}</p> : null}
        {discarding ? <div className="space-y-3 rounded-xl border border-[var(--ui-border)] p-3"><p>Discard this unsent report?</p><div className="flex flex-wrap gap-2"><button className="ui-button ui-button--secondary" type="button" onClick={() => setDiscarding(false)}>Keep editing</button><button className="ui-button ui-button--danger" type="button" onClick={onClose}>Discard</button></div></div> : <div className="flex flex-wrap gap-3"><button type="submit" className="ui-button" disabled={pending}>{pending ? "Sending…" : "Send report"}</button><button type="button" className="ui-button ui-button--secondary" disabled={pending} onClick={close}>Cancel</button></div>}
      </form>}
    </div>
  </div></Dialog>;
}
