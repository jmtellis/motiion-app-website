"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { buildSignupUserMetadata } from "@/lib/auth/oauth-shared";
import { loadCastingApplication, completeCastingApplication } from "@/app/casting/[id]/application-actions";
import { prepareCastingApplicationUpload } from "@/lib/casting/application-upload";
import { CheckEmailForm } from "@/components/auth/CheckEmailForm";
import { readCastingApplicationDraft } from "@/lib/casting/application-requirements";

type Application = Extract<Awaited<ReturnType<typeof loadCastingApplication>>, { ok: true }>;

export function CastingApplicationModal({ projectId, roleId, roleTitle, onClose, onComplete, preview }: {
  preview?: "account" | "details"; projectId: string; roleId: string; roleTitle: string; onClose: () => void; onComplete: () => void;
}) {
  const previewStage = process.env.NODE_ENV === "development" ? preview : undefined;
  const [stage, setStage] = useState<"loading" | "account" | "verify" | "details" | "done">(previewStage ?? "loading");
  const [application, setApplication] = useState<Application | undefined>(previewStage === "details" ? { ok: true, profile: null, role: { project_id: projectId, slate_required: true, max_submission_links: 2, agency_required: false }, email: "preview@example.test", userId: "preview", submitted: false, questions: [] } : undefined);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftAvailable, setDraftAvailable] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnPath = `/casting/${encodeURIComponent(projectId)}?role=${encodeURIComponent(roleId)}&apply=1`;
  const draftKey = (userId: string) => `motiion:casting-application:${userId}:${roleId}`;
  function saveDraft(form: FormData) {
    if (!application?.userId || previewStage) return;
    const fields = Object.fromEntries([...form].filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    setDraft(fields);
    try { window.localStorage.setItem(draftKey(application.userId), JSON.stringify({ userId: application.userId, roleId, fields })); }
    catch { setDraftAvailable(false); }
  }

  useEffect(() => {
    dialog.current?.showModal();
    if (previewStage) return;
    let active = true;
    async function load() {
      try {
      const client = createClientSupabaseClient();
      const user = client ? (await client.auth.getUser()).data.user : null;
      if (!active) return;
      if (!user || user.is_anonymous) { setStage("account"); return; }
      setEmailAddress(user.email ?? "");
      if (!user.email_confirmed_at) { setStage("verify"); return; }
      const result = await loadCastingApplication(roleId);
      if (!active) return;
      if (!result.ok) { setError(result.error); return; }
      try {
        setDraft(readCastingApplicationDraft(window.localStorage.getItem(`motiion:casting-application:${user.id}:${roleId}`), user.id, roleId));
      } catch { setDraft({}); setDraftAvailable(false); }
      setApplication(result); setStage(result.submitted ? "done" : "details");
      } catch { if (active) setError("Couldn’t load your submission. Check your connection and retry."); }
    }
    void load();
    const subscription = createClientSupabaseClient()?.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN" || event === "SIGNED_OUT") void load(); });
    return () => { active = false; subscription?.data.subscription.unsubscribe(); };
  }, [roleId, previewStage, retry]);

  async function account(form: FormData) {
    if (previewStage) return;
    setBusy(true); setError(undefined);
    try {
      const client = createClientSupabaseClient();
      if (!client) throw new Error("Sign-in is temporarily unavailable.");
      const email = String(form.get("email") ?? "").trim();
      setEmailAddress(email);
      const password = String(form.get("password") ?? "");
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("flow", "signup"); callback.searchParams.set("account_type", "talent");
      callback.searchParams.set("casting_return", returnPath);
      const result = login
        ? await client.auth.signInWithPassword({ email, password })
        : await client.auth.signUp({ email, password, options: { emailRedirectTo: callback.toString(), data: buildSignupUserMetadata("talent", returnPath) } });
      if (result.error) throw result.error;
      if (!result.data.session) {
        try { window.localStorage.setItem(`motiion:confirmation-sent:${email.toLowerCase()}`, String(Date.now())); } catch { /* resend still enforces its local visit cooldown */ }
        setStage("verify");
      }
      else {
        const loaded = await loadCastingApplication(roleId);
        if (!loaded.ok) throw new Error(loaded.error);
        try { setDraft(readCastingApplicationDraft(window.localStorage.getItem(draftKey(loaded.userId)), loaded.userId, roleId)); }
        catch { setDraft({}); setDraftAvailable(false); }
        setApplication(loaded); setStage(loaded.submitted ? "done" : "details");
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn’t sign in."); }
    finally { setBusy(false); }
  }

  async function submit(form: FormData) {
    if (previewStage) return;
    setBusy(true); setError(undefined);
    try {
      const prepared = await prepareCastingApplicationUpload(form);
      saveDraft(prepared);
      const result = await completeCastingApplication(roleId, prepared);
      if (!result.ok) throw new Error(result.error);
      if (application?.userId) try { window.localStorage.removeItem(draftKey(application.userId)); } catch { /* saved submission is authoritative */ }
      setStage("done");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Couldn’t submit. Please try again."); }
    finally { setBusy(false); }
  }

  const profile = application?.profile;
  return <dialog ref={dialog} aria-labelledby="casting-application-title" className="casting-application" onCancel={event => { event.preventDefault(); if (!busy) { if (stage === "done") onComplete(); else onClose(); } }}>
    <button className="casting-application-close" aria-label="Close submission" disabled={busy} onClick={stage === "done" ? onComplete : onClose}>×</button>
    <h2 id="casting-application-title" className="casting-modal-title">{stage === "done" ? "Submission received" : `Submit for ${roleTitle}`}</h2>
    {stage === "loading" && !error && <p role="status">Loading your details…</p>}
    {stage === "loading" && error && <button className="casting-modal-primary" onClick={() => { setError(undefined); setRetry(value => value + 1); }}>Retry</button>}
    {stage === "account" && <form action={account}>
      <p>{login ? "Sign in to use your profile." : "Create your Motiion account to submit and receive updates."}</p>
      <label>Email<input name="email" type="email" autoComplete="email" defaultValue={emailAddress} required /></label>
      <label>Password<input name="password" type="password" autoComplete={login ? "current-password" : "new-password"} minLength={8} required /></label>
      {!login && <p className="casting-application-help">By creating an account, you agree to our <a href="/terms" target="_blank" rel="noreferrer">Terms</a> and <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</p>}
      <button className="casting-modal-primary" disabled={busy || Boolean(previewStage)}>{busy ? "Please wait…" : login ? "Sign in" : "Create account"}</button>
      <button type="button" className="casting-modal-dismiss" disabled={busy} onClick={() => { setLogin(!login); setError(undefined); }}>{login ? "Create an account" : "Already have an account? Sign in"}</button>
    </form>}
    {stage === "verify" && <div><CheckEmailForm email={emailAddress} accountType="talent" returnTo={returnPath} /><button className="casting-modal-dismiss" onClick={() => { setLogin(true); setStage("account"); }}>Sign in here after confirming</button></div>}
    {stage === "details" && <form key={application?.userId} action={submit} onChange={event => saveDraft(new FormData(event.currentTarget))}>
      <p>Your details are saved to your account. You can finish your full profile later.</p>
      {!draftAvailable && <p role="status">This browser couldn’t save your draft. Keep this tab open until you submit.</p>}
      {(["headshotPath", "headshotOriginalPath", "resumePath"] as const).map(key => draft[key] ? <input key={key} type="hidden" name={key} value={draft[key]} /> : null)}
      <div className="casting-application-names">
        <label>First name<input name="firstName" autoComplete="given-name" defaultValue={draft.firstName ?? profile?.first_name ?? ""} required /></label>
        <label>Last name<input name="lastName" autoComplete="family-name" defaultValue={draft.lastName ?? profile?.last_name ?? ""} required /></label>
      </div>
      <label>Date of birth<input name="dateOfBirth" type="date" autoComplete="bday" defaultValue={draft.dateOfBirth ?? profile?.date_of_birth?.slice(0, 10) ?? ""} required /></label>
      <label>Headshot {profile?.headshot_urls?.length || draft.headshotPath ? "· saved" : ""}<input name="headshot" type="file" accept="image/jpeg,image/png,image/webp" required={!profile?.headshot_urls?.length && !draft.headshotPath} /></label>
      <span className="casting-application-help">JPG, PNG or WebP, up to 6 MB. {profile?.headshot_urls?.length ? "Leave empty to keep your current headshot." : ""}</span>
      <label>Résumé {profile?.resume_url || draft.resumePath ? "· saved" : profile?.onboarding_completed_at ? "(optional)" : ""}<input name="resume" type="file" accept="application/pdf" required={!profile?.onboarding_completed_at && !profile?.resume_url && !draft.resumePath} /></label>
      <span className="casting-application-help">PDF, up to 8 MB. Saved for casting and later credit import.</span>
      <label>Agency / representation {application?.role.agency_required ? "" : "(optional)"}<input name="representation" defaultValue={draft.representation ?? profile?.representation ?? ""} required={Boolean(application?.role.agency_required)} /></label>
      {application?.role.slate_required && <label>Slate video link<input name="slate" type="url" placeholder="https://" defaultValue={draft.slate ?? ""} required /></label>}
      {Number(application?.role.max_submission_links) > 0 && <label>Work links (optional, up to {application?.role.max_submission_links})<textarea name="links" placeholder="One https:// link per line" defaultValue={draft.links ?? ""} /></label>}
      {application?.questions.map(question => <label key={question.id}>{question.prompt}{question.required ? "" : " (optional)"}<textarea name={`question:${question.id}`} required={question.required} maxLength={4000} defaultValue={draft[`question:${question.id}`] ?? ""} /></label>)}
      <label>Note to casting (optional)<textarea name="note" maxLength={3000} defaultValue={draft.note ?? ""} /></label>
      <button className="casting-modal-primary" disabled={busy || Boolean(previewStage)}>{busy ? "Saving and submitting…" : "Submit"}</button>
    </form>}
    {stage === "done" && <div><p>Your submission is linked to your Motiion account. The casting team can review your headshot, résumé and role materials.</p><Link className="casting-modal-primary" href={profile?.onboarding_completed_at ? "/opportunities?tab=submissions" : "/onboarding"}>{profile?.onboarding_completed_at ? "View my submissions" : "Complete profile"}</Link><Link className="casting-modal-dismiss" href="/#signup">Get the app</Link></div>}
    {error && <p className="casting-submit-error" role="alert">{error}</p>}
  </dialog>;
}
