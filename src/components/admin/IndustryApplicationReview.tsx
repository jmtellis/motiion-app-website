"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewIndustryApplication } from "@/app/admin/industry-applications/actions";
import type { IndustryApplication } from "@/lib/talent-buyers/industry-application";
export function IndustryApplicationReview({ application: a }: { application: IndustryApplication }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  function review(decision: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await reviewIndustryApplication(a.user_id, a.version, decision, feedback);
        if (!result.ok) { setError(result.error ?? "Could not save decision."); return; }
        router.refresh();
      } catch { setError("Could not save decision. Refresh and try again."); }
    });
  }
  return <section className="space-y-4 rounded-xl border border-white/20 p-6">
    <h2 className="text-xl font-semibold">{a.full_name}</h2><p>{a.professional_role} · {a.organization}</p><p>{a.contact_email}</p>
    {a.work_url && <a className="underline" href={a.work_url} target="_blank" rel="noopener noreferrer">Professional work</a>}
    <p className="whitespace-pre-wrap">{a.hiring_projects}</p>
    {a.feedback && <p>Previous feedback: {a.feedback}</p>}
    <label className="block">Feedback visible to applicant<textarea className="mt-2 block w-full rounded border bg-transparent p-3" rows={3} maxLength={3000} value={feedback} disabled={busy} onChange={e => setFeedback(e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    <div className="flex flex-wrap gap-4"><button className="launch-button" disabled={busy} onClick={() => review("approved")}>Approve access</button><button className="launch-button secondary" disabled={busy || !feedback.trim()} onClick={() => review("needs_information")}>Request more information</button><button className="launch-button secondary" disabled={busy || !feedback.trim()} onClick={() => review("rejected")}>Reject application</button></div>
  </section>;
}
