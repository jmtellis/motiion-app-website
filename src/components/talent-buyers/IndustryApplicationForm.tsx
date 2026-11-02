"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { submitIndustryApplication } from "@/app/talent-buyers/application/actions";
import { industryApplicationCopy, type IndustryApplication, type IndustryApplicationDetails } from "@/lib/talent-buyers/industry-application";
export function IndustryApplicationForm({ application, initial, returnHref }: {
  application: IndustryApplication | null; initial: IndustryApplicationDetails; returnHref: string;
}) {
  const router = useRouter();
  const [details, setDetails] = useState(initial);
  const [editing, setEditing] = useState(!application);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const copy = application ? industryApplicationCopy[application.status] : null;
  const fields: { key: keyof IndustryApplicationDetails; label: string; type?: string; max: number }[] = [
    { key: "full_name", label: "Name", max: 200 },
    { key: "professional_role", label: "Professional role", max: 200 },
    { key: "organization", label: "Company or Independent", max: 200 },
    { key: "contact_email", label: "Contact email (personal email is welcome)", type: "email", max: 320 },
    { key: "work_url", label: "Professional work link (optional) — company site, portfolio, or credits", type: "url", max: 2000 },
  ];
  return <div className="mx-auto max-w-xl space-y-6 px-6 py-12">
    <h1 className="text-3xl font-semibold">{copy?.title ?? "Apply for industry access"}</h1>
    <p>{copy?.body ?? "Tell us about your work. Motiion reviews applications before granting access to professional features. No invitation or access code is needed."}</p>
    {application?.feedback && <div role="note" className="rounded-xl border p-4"><strong>Feedback from Motiion</strong><p className="whitespace-pre-wrap">{application.feedback}</p></div>}
    {editing ? <form className="space-y-5" onSubmit={event => {
      event.preventDefault(); setError(null);
      startTransition(async () => {
        try {
          const result = await submitIndustryApplication(details, application?.version ?? 0);
          if (!result.ok) { setError(result.error ?? "Could not submit. Try again."); return; }
          setEditing(false); router.refresh();
        } catch { setError("Could not submit. Your details are still here; please try again."); }
      });
    }}>
      {fields.map(field => <label key={field.key} className="block space-y-2"><span>{field.label}</span>
        <input className="w-full rounded-lg border border-white/20 bg-transparent p-3" required={field.key !== "work_url"} type={field.type ?? "text"} maxLength={field.max} value={details[field.key]} disabled={busy}
          onChange={event => setDetails(current => ({ ...current, [field.key]: event.target.value }))} />
      </label>)}
      <label className="block space-y-2"><span>What kinds of projects do you hire dancers for?</span>
        <textarea className="w-full rounded-lg border border-white/20 bg-transparent p-3" required minLength={10} maxLength={3000} rows={4} value={details.hiring_projects} disabled={busy}
          onChange={event => setDetails(current => ({ ...current, hiring_projects: event.target.value }))} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? "Submitting…" : application ? "Save and submit for review" : "Submit application"}</button>
      {application && <button className="ml-4" type="button" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>}
    </form> : <div className="flex flex-wrap gap-4">
      <button className="btn-primary" onClick={() => router.refresh()}>Check status</button>
      <button onClick={() => setEditing(true)}>Update application</button>
    </div>}
    {!editing && error && <p role="alert">{error}</p>}
    <Link className="block underline" href={returnHref}>Back</Link>
    <button disabled={busy} onClick={() => startTransition(async () => {
      const db = createClientSupabaseClient();
      if (!db) { setError("Could not sign out. Please try again."); return; }
      const { error } = await db.auth.signOut();
      if (error) { setError(error.message); return; }
      router.push("/login"); router.refresh();
    })}>Sign out</button>
  </div>;
}
