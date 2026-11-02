"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewIndustryApplication } from "@/app/admin/industry-applications/actions";
import { PersonAvatar } from "./dashboard/PersonAvatar";
import { industryReviewWebsite, type IndustryReviewProfile } from "@/lib/admin-dashboard/industry-review";
import type { IndustryApplication } from "@/lib/talent-buyers/industry-application";
export function IndustryApplicationReview({ application: a, profile, disabled = false }: { application: IndustryApplication; profile: IndustryReviewProfile; disabled?: boolean }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const website = industryReviewWebsite(a.work_url);
  const unavailable = profile.status !== "available";
  function review(decision: string) {
    if (disabled) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await reviewIndustryApplication(a.user_id, a.version, decision, feedback);
        if (!result.ok) { setError(result.error ?? "Could not save decision."); return; }
        router.refresh();
      } catch { setError("Could not save decision. Refresh and try again."); }
    });
  }
  return <section className="industry-review">
    <header className="industry-review-header">
      <div className="industry-review-photo"><PersonAvatar key={a.user_id} urls={profile.imageUrls} name={a.full_name} large /></div>
      <div><p className="launch-eyebrow">INDUSTRY APPLICANT</p><h2>{a.full_name || "Name not provided"}</h2><p className="launch-note">Applicant photo · current profile</p>
      {unavailable ? <p role="status">{profile.status === "unavailable" ? "Current profile could not be loaded. Photo and acquisition details are unavailable." : "No matching current profile was found. Photo and acquisition details are unavailable."}</p> : !profile.imageUrls.length ? <p className="launch-note">No usable photo provided.</p> : null}</div>
    </header>
    <section aria-label="Submitted application">
      <h3>Submitted application</h3><p className="launch-note">Applicant-submitted details · version {a.version}. These are the details used for this review.</p>
      <dl className="industry-review-fields">
        <div><dt>Name</dt><dd>{a.full_name?.trim() || "Not provided"}</dd></div>
        <div><dt>Professional role</dt><dd>{a.professional_role?.trim() || "Not provided"}</dd></div>
        <div><dt>Company / Independent</dt><dd>{a.organization?.trim() || "Not provided"}</dd></div>
        <div><dt>Contact email</dt><dd>{a.contact_email?.trim() || "Not provided"}</dd></div>
        <div className="industry-review-wide"><dt>Portfolio / Website</dt><dd>{website ? <a className="launch-link" href={website} target="_blank" rel="noopener noreferrer">{website} ↗</a> : a.work_url?.trim() ? "Provided link is not a valid HTTP(S) website." : "Not provided"}</dd></div>
        <div className="industry-review-wide"><dt>Project types / Hiring projects</dt><dd>{a.hiring_projects?.trim() || "Not provided"}</dd></div>
      </dl>
    </section>
    <section className="industry-review-acquisition" aria-label="How they heard about Motiion">
      <h3>How they heard about Motiion</h3><p className="launch-note">Current profile information; not captured in the application version above.</p>
      <dl className="industry-review-fields">
        <div><dt>Source</dt><dd>{unavailable ? "Unavailable" : profile.acquisitionSource}</dd></div>
        <div><dt>Supporting detail</dt><dd>{unavailable ? "Unavailable" : profile.acquisitionDetail}</dd></div>
      </dl>
    </section>
    {a.feedback && <p>Previous feedback: {a.feedback}</p>}
    <label className="block">Feedback visible to applicant<textarea className="mt-2 block w-full rounded border bg-transparent p-3" rows={3} maxLength={3000} value={feedback} disabled={busy || disabled} onChange={e => setFeedback(e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}
    {disabled && <p className="launch-note">Preview · decisions disabled</p>}
    <div className="flex flex-wrap gap-4"><button className="launch-button" disabled={busy || disabled} onClick={() => review("approved")}>Approve access</button><button className="launch-button secondary" disabled={busy || disabled || !feedback.trim()} onClick={() => review("needs_information")}>Request more information</button><button className="launch-button secondary" disabled={busy || disabled || !feedback.trim()} onClick={() => review("rejected")}>Reject application</button></div>
  </section>;
}
