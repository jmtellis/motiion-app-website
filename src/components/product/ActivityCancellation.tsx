"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { cancelActivityReservation } from "@/lib/app/activities";

export function ActivityCancellation({ activityId, paid, refundRequested, onCancelled }: { activityId: string; paid: boolean; refundRequested?: boolean; onCancelled: (message: string) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  async function cancel() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(null);
    try {
      const result = await cancelActivityReservation(activityId);
      if (!result.ok) { setError(result.error); return; }
      setOpen(false);
      if (result.cancelled) onCancelled(result.message); else setNotice(result.message);
      router.refresh();
    } catch { setError("Couldn't reach registration. Your cancellation has not been confirmed. Please retry."); }
    finally { busy.current = false; setPending(false); }
  }
  return <>
    {notice || refundRequested ? <p role="status" className="casting-body-copy">{notice ?? "A refund has been requested. Your reservation remains active until its cancellation is confirmed."}</p> : <button type="button" className="casting-modal-dismiss" onClick={() => setOpen(true)}>Cancel my reservation</button>}
    <Modal open={open} onClose={() => { if (!pending) setOpen(false); }} title="Cancel your reservation?" alert description={paid
      ? "Cancellations at least 24 hours before the scheduled start receive a full refund to the original payment method. Later cancellations release your place without a refund. The payment service checks eligibility when you confirm."
      : "Your place will be released. You can reserve again if a place is still available."}>
      {paid ? <p className="text-sm text-[var(--ui-muted)]">The shared payment service currently interprets the scheduled start in UTC for its 24-hour cutoff.</p> : null}
      {error ? <p className="ui-status ui-status--error" role="alert">{error}</p> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="ui-button ui-button--danger" disabled={pending} onClick={() => void cancel()}>{pending ? "Canceling…" : "Confirm cancellation"}</button>
        <button type="button" className="ui-button ui-button--secondary" disabled={pending} onClick={() => setOpen(false)}>Keep my place</button>
      </div>
    </Modal>
  </>;
}
