"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { buildSizeSheetPdf, sizeSheetRows } from "@/components/portfolio/size-sheet";
import { loadPendingRequestContext, loadOwnRequestSizeSheet, deliverRequestSizeSheet, respondToPendingRequest } from "@/lib/app/conversations";
import { requestScheduleLines, type AvailabilityResponse } from "@/lib/messaging/request-actions";
import { friendlyRequestSchedule } from "@/lib/messaging/reliability";
import type { HomePendingRequest } from "@/types/app";

export function RequestResponsePanel({ request, action, onClose, onDone }: {
  request: HomePendingRequest; action: "primary" | "negative"; onClose: () => void; onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [response, setResponse] = useState<AvailabilityResponse>(action === "negative" ? "unavailable" : "available");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sizeSheet, setSizeSheet] = useState<Awaited<ReturnType<typeof loadOwnRequestSizeSheet>> | null>(null);
  const [context, setContext] = useState<Awaited<ReturnType<typeof loadPendingRequestContext>> | null>(null);
  const busy = useRef(false);
  const delivered = useRef(false);
  const deliveryId = useRef<string | null>(null);
  const availability = request.request_kind === "availability_check";
  const sizes = request.request_kind === "size_sheet" && action === "primary";
  const confirmation = request.request_kind === "booking_confirmation";
  useEffect(() => {
    if (!sizes) return;
    let cancelled = false;
    void loadOwnRequestSizeSheet().then((result) => { if (!cancelled) setSizeSheet(result); })
      .catch(() => { if (!cancelled) setError("Couldn't load your measurements. Close and retry."); });
    return () => { cancelled = true; };
  }, [sizes]);
  useEffect(() => {
    let cancelled = false;
    void loadPendingRequestContext(request.request_kind, request.id).then((result) => { if (!cancelled) setContext(result); })
      .catch(() => { if (!cancelled) setContext({ data: null, error: "Could not load the request. Close and retry." }); });
    return () => { cancelled = true; };
  }, [request.request_kind, request.id]);
  const schedule = requestScheduleLines(context?.data?.dates);
  const rows = sizeSheet?.data ? sizeSheetRows(sizeSheet.data.height, sizeSheet.data.sizing) : [];
  const canSend = context?.data?.status === "pending" && (!sizes || Boolean(sizeSheet?.data && rows.length));
  async function submit() {
    if (busy.current || !canSend) return;
    busy.current = true; setPending(true); setError(null);
    try {
      if (sizes && sizeSheet?.data && !delivered.current) {
        const blob = await buildSizeSheetPdf({ ...sizeSheet.data, profileUrl: `${window.location.origin}/profile/${sizeSheet.data.userId}` });
        const form = new FormData();
        deliveryId.current ??= crypto.randomUUID();
        form.set("requestId", request.id); form.set("deliveryId", deliveryId.current); form.set("note", note);
        form.set("pdf", blob, "size-sheet.pdf");
        const delivery = await deliverRequestSizeSheet(form);
        if (!delivery.ok) { setError(delivery.error ?? "Could not deliver the size sheet. Please retry."); return; }
        delivered.current = true;
      }
      const effectiveAction = availability ? response === "unavailable" ? "negative" : "primary" : action;
      const result = await respondToPendingRequest(request.request_kind, request.id, effectiveAction, { responseKind: availability ? response : undefined, note });
      if (!result.ok) { setError(`${delivered.current ? "Your size sheet was delivered, but the request couldn't be closed. " : ""}${result.error ?? "Please retry."}`); return; }
      onDone();
    } catch { setError("Your response could not be confirmed. Check your connection and try again."); }
    finally { busy.current = false; setPending(false); }
  }
  return <Modal open onClose={() => { if (!busy.current) onClose(); }} placement="drawer"
    title={availability ? "Your availability" : sizes ? "Share your size sheet" : confirmation ? "Confirm participation" : "Respond to request"}
    description={`Requested by ${request.inviter_name || "the project team"}`}>
    <div className="space-y-4">
      <div><h3 className="font-semibold text-[var(--ui-text)]">{request.title}</h3><p className="mt-1 text-sm text-[var(--ui-muted)]">{friendlyRequestSchedule(request.detail_text) ?? request.detail_text}</p></div>
      {!context ? <p role="status">Loading request details…</p> : context.error ? <p role="alert" className="text-[var(--ui-danger)]">{context.error}</p> : context.data?.status !== "pending" ? <p role="status">This request has already been answered. Close and refresh your inbox.</p> : null}
      {schedule.length ? <div className="rounded-xl bg-[var(--ui-surface-soft)] p-4"><ul className="space-y-1 text-sm">{schedule.map((line) => <li key={line}>{line}</li>)}</ul>{context?.data?.timeZone ? <p className="mt-2 text-xs text-[var(--ui-muted)]">Times in {context.data.timeZone}</p> : null}</div> : context?.data?.eventStart ? <p className="text-sm">{new Date(context.data.eventStart).toLocaleString()}{context.data.eventEnd ? ` – ${new Date(context.data.eventEnd).toLocaleString()}` : ""} (your time zone)</p> : null}
      {context?.data?.location ? <p className="text-sm">{context.data.location}</p> : null}
      {context?.data?.message && context.data.message !== request.detail_text ? <p className="whitespace-pre-wrap text-sm text-[var(--ui-muted)]">{context.data.message}</p> : null}
      {availability ? <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Select your response</legend>{([
        ["available", "Available"], ["available_with_conflict", "Available with a conflict"], ["unavailable", "Not available"],
      ] as const).map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--ui-border)] p-3"><input type="radio" name="availability" checked={response === value} onChange={() => setResponse(value)} disabled={pending} />{label}</label>)}</fieldset> : confirmation ? <p className="text-sm text-[var(--ui-muted)]">{action === "negative" ? "Let the team know you cannot participate." : "Confirm that you can participate in the schedule shown above."}</p> : null}
      {sizes ? !sizeSheet && !error ? <p role="status">Loading your measurements…</p> : rows.length ? <dl className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--ui-surface-soft)] p-4 text-sm">{rows.map(([label, value]) => <div key={label}><dt className="text-[var(--ui-muted)]">{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl> : <p role="alert">{sizeSheet?.error ?? "Add your measurements before sharing a size sheet."} <Link href="/portfolio?panel=sizing" className="underline">Edit size sheet</Link></p> : null}
      <label className="ui-field"><span className="ui-field__label">{response === "available_with_conflict" && availability ? "Describe your conflict" : "Note to the team (optional)"}</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} disabled={pending} /></label>
      {error ? <p role="alert" className="text-sm text-[var(--ui-danger)]">{error}</p> : null}
      <div className="flex gap-2"><button type="button" className="ui-button ui-button--secondary" disabled={pending} onClick={onClose}>Cancel</button><button type="button" className="ui-button" disabled={pending || !canSend || (availability && response === "available_with_conflict" && !note.trim())} onClick={() => void submit()}>{pending ? "Sending…" : sizes ? "Send size sheet" : action === "negative" && !availability ? "Decline" : "Send response"}</button></div>
    </div>
  </Modal>;
}
