"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Clock3, Camera, ArrowLeft, ArrowRight } from "lucide-react";
import { useSignOut } from "@/hooks/use-sign-out";
import { submitIndustryApplication, uploadIndustryApplicationPhoto } from "@/app/talent-buyers/application/actions";
import { checkUsernameAvailability } from "@/app/onboarding/actions";
import { SignupSplitShell } from "@/components/auth/SignupSplitShell";
import { acquisitionSourceOptions } from "@/lib/talent/copy";
import { resizeImageFile } from "@/lib/onboarding/client-media";
import { industryApplicationCopy, industryApplicationSteps, industryProjectOptions, parseIndustryApplicationDraft, validateIndustryApplicationStep, type IndustryApplication, type IndustryApplicationDraft, type IndustryApplicationStep } from "@/lib/talent-buyers/industry-application";
import "./industry-application.css";

const stepLabels = { identity: "About you", work: "Work", projects: "Projects", acquisition: "Source", review: "Review" };
const titles = { identity: "About you", work: "Your work", projects: "The projects you cast", acquisition: "How did you find us?", review: "Review your application" };
export function IndustryApplicationForm({ application, initial, returnHref, userId }: {
  application: IndustryApplication | null; initial: IndustryApplicationDraft; returnHref: string; userId: string;
}) {
  const router = useRouter();
  const { signOut, pending: signingOut, error: signOutError } = useSignOut("/login");
  const [details, setDetails] = useState(initial);
  const [step, setStep] = useState<IndustryApplicationStep>("identity");
  const [editing, setEditing] = useState(!application);
  const [hydrated, setHydrated] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, startTransition] = useTransition();
  const [refreshing, startRefresh] = useTransition();
  const [usernameResult, setUsernameResult] = useState<{ username: string; available: boolean; message: string } | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const draftKey = `motiion:industry-application:${userId}`;
  const version = application?.version ?? 0;
  const copy = application ? industryApplicationCopy[application.status] : null;
  const index = industryApplicationSteps.indexOf(step);
  const locked = busy || uploading || signingOut;
  useEffect(() => {
    try {
      const saved = parseIndustryApplicationDraft(window.localStorage.getItem(draftKey), userId, version);
      // Hydrate browser-only storage after SSR; the server cannot read this draft.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) { setDetails(saved.details); setStep(saved.step); setEditing(true); }
    } catch { setStorageAvailable(false); }
    setHydrated(true);
  }, [draftKey, userId, version]);
  useEffect(() => {
    if (!hydrated || !editing || receipt) return;
    try { window.localStorage.setItem(draftKey, JSON.stringify({ userId, applicationVersion: version, details, step })); }
    // A storage failure is an external-system state, and must be visible to the applicant.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    catch { setStorageAvailable(false); }
  }, [details, step, draftKey, userId, version, hydrated, editing, receipt]);
  useEffect(() => {
    if (editing || busy) return;
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [editing, busy, router]);
  useEffect(() => {
    if (step !== "identity" || !/^[a-z0-9_]{3,30}$/.test(details.username)) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const result = await checkUsernameAvailability(details.username);
        if (active) setUsernameResult({ username: details.username, available: result.available, message: result.message ?? (result.available ? "Username available" : "Choose another username") });
      } catch { if (active) setUsernameResult({ username: details.username, available: false, message: "Couldn’t check your username. Please try again." }); }
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [details.username, step]);
  useEffect(() => { if (hydrated) { title.current?.focus(); title.current?.scrollIntoView({ block: "nearest" }); } }, [step, hydrated]);
  function update(key: keyof IndustryApplicationDraft, value: string) { setDetails(current => ({ ...current, [key]: value })); setError(null); }
  function navigate(next: IndustryApplicationStep) { setStep(next); setError(null); }
  function next() {
    const validation = validateIndustryApplicationStep(step, details);
    if (validation) { setError(validation); return; }
    if (step === "identity" && details.username !== initial.username && (usernameResult?.username !== details.username || !usernameResult.available)) { setError(usernameResult?.message ?? "Please wait while we check your username."); return; }
    navigate(industryApplicationSteps[Math.min(index + 1, industryApplicationSteps.length - 1)]);
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) { setError("Choose an image under 12 MB."); return; }
    setUploading(true); setError(null);
    try {
      const blob = await resizeImageFile(file, 1000);
      const data = new FormData(); data.set("photo", new File([blob], "profile.jpg", { type: "image/jpeg" }));
      const result = await uploadIndustryApplicationPhoto(data);
      if (result.ok) update("avatar_url", result.url); else setError(result.error);
    } catch { setError("Couldn’t prepare that photo. Try a JPG or PNG image."); }
    finally { setUploading(false); }
  }
  function submit() {
    const validation = validateIndustryApplicationStep("review", details);
    if (validation) { setError(validation); return; }
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitIndustryApplication(details, version);
        if (!result.ok) { setError(result.error ?? "Could not submit. Your draft is saved; please try again."); return; }
        try { window.localStorage.removeItem(draftKey); } catch { /* submitted data is persisted by the server */ }
        setReceipt(true); setEditing(false); router.refresh();
      } catch { setError("Could not submit. Your details are still here; please try again."); }
    });
  }
  function field(key: keyof IndustryApplicationDraft, label: string, options: { type?: string; max?: number; optional?: boolean; help?: string } = {}) {
    return <label className="signup-split-field"><span>{label}{options.optional ? " (optional)" : ""}</span><input type={options.type ?? "text"} required={!options.optional} maxLength={options.max ?? 200} disabled={locked} value={details[key]} autoComplete={key === "full_name" ? "name" : key === "contact_email" ? "email" : key === "username" ? "username" : undefined} onChange={event => update(key, key === "username" ? event.target.value.toLowerCase().replace(/^@/, "") : event.target.value)} />{options.help && <small className="signup-split-hint">{options.help}</small>}</label>;
  }
  if (!hydrated) return <SignupSplitShell headline="Your work. Your next cast." subtext="Apply for your professional workspace." steps={[]} showNav showWordmark><p role="status" className="signup-split-hint">Restoring your application…</p></SignupSplitShell>;
  return <SignupSplitShell headline="Your work. Your next cast." subtext="Apply once for a workspace to discover talent, run castings, and coordinate your projects." steps={industryApplicationSteps.map((key, position) => ({ number: position + 1, label: stepLabels[key], status: position < index ? "completed" : position === index ? "active" : "pending" }))} showSteps={editing} showNav showWordmark>
    <div className="industry-application signup-split-form">
      {editing ? <>
        <p className="industry-application__eyebrow">Industry application · {index + 1} of {industryApplicationSteps.length}</p>
        <h1 ref={title} tabIndex={-1} className="signup-split-form__title">{titles[step]}</h1>
        <p className="signup-split-form__subtitle">{step === "identity" ? "A few essentials so we know who’s joining. Your birthday stays private." : step === "work" ? "Independent professionals and personal email addresses are welcome." : step === "projects" ? "Tell us the kinds of work you hire dancers for." : step === "acquisition" ? "Help us understand how our community is growing." : "Check your details before sending them to the Motiion team."}</p>
        <form className="industry-application__form" onSubmit={event => { event.preventDefault(); if (step === "review") submit(); else next(); }}>
          {step === "identity" && <>
            <div className="industry-application__photo-row">
              <div className="industry-application__avatar">{details.avatar_url ? <Image src={details.avatar_url} alt="Your profile photo" width={88} height={88} unoptimized /> : <Camera aria-hidden size={28} />}</div>
              <label className="industry-application__upload"><span>{uploading ? "Saving photo…" : details.avatar_url ? "Change photo" : "Add profile photo"}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={locked} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /><small>JPG, PNG, or WebP · up to 12 MB</small></label>
            </div>
            {field("full_name", "Name")}
            {field("username", "Username", { max: 30, help: "3–30 lowercase letters, numbers, or underscores." })}
            {usernameResult?.username === details.username && <p role="status" className="signup-split-hint">{usernameResult.message}</p>}
            {field("date_of_birth", "Date of birth", { type: "date", help: "You must be at least 18 to join Motiion." })}
          </>}
          {step === "work" && <>
            {field("professional_role", "Professional role", { help: "For example: choreographer, casting director, or producer." })}
            {field("organization", "Company or Independent")}
            {field("contact_email", "Contact email", { type: "email", max: 320 })}
            {field("work_url", "Website, portfolio, or credits", { max: 2000, optional: true, help: "A public link such as yoursite.com helps us understand your work." })}
          </>}
          {step === "projects" && <>
            <div className="industry-application__project-options" aria-label="Add a project type">{industryProjectOptions.map(option => <button type="button" key={option} disabled={locked} onClick={() => { const value = details.hiring_projects.trim(); if (!value.includes(option)) update("hiring_projects", value ? `${value}; ${option}` : option); }}>{option}</button>)}</div>
            <label className="signup-split-field"><span>Projects you hire for</span><textarea required minLength={10} maxLength={3000} rows={5} value={details.hiring_projects} disabled={locked} onChange={event => update("hiring_projects", event.target.value)} /><small className="signup-split-hint">Use the suggestions above or describe your projects in your own words.</small></label>
          </>}
          {step === "acquisition" && <>
            <fieldset className="industry-application__sources"><legend className="sr-only">How you heard about Motiion</legend>{acquisitionSourceOptions.map(option => <label key={option.value}><input type="radio" name="source" value={option.value} checked={details.acquisition_source === option.value} onChange={() => update("acquisition_source", option.value)} />{option.label}</label>)}</fieldset>
            {field("acquisition_source_detail", "Anything else you’d like us to know?", { optional: true, max: 2000 })}
          </>}
          {step === "review" && <>
            <div className="industry-application__review"><h2>{details.full_name}</h2><p>@{details.username}</p><dl><div><dt>Professional role</dt><dd>{details.professional_role}</dd></div><div><dt>Company</dt><dd>{details.organization}</dd></div><div><dt>Contact</dt><dd>{details.contact_email}</dd></div>{details.work_url && <div><dt>Website</dt><dd>{details.work_url}</dd></div>}<div><dt>Hiring projects</dt><dd>{details.hiring_projects}</dd></div></dl></div>
            <p className="signup-split-hint">Submitting starts a review. Email confirmation, professional approval, identity checks, and Pro subscriptions are separate.</p>
          </>}
          {error && <p className="signup-split-error" role="alert">{error}</p>}
          <div className="industry-application__actions">{index > 0 && <button type="button" className="signup-split-text-btn" disabled={locked} onClick={() => navigate(industryApplicationSteps[index - 1])}><ArrowLeft size={16} aria-hidden /> Back</button>}<button className="signup-split-submit" disabled={locked || !hydrated}>{busy ? "Submitting…" : uploading ? "Saving photo…" : step === "review" ? application ? "Save and resubmit" : "Submit application" : "Continue"}<ArrowRight size={16} aria-hidden /></button></div>
          <p className="signup-split-hint" role="status">{storageAvailable ? "Your draft is saved on this device as you go." : "Browser storage is unavailable. Keep this page open until you submit."}</p>
          {application && <button className="signup-split-text-btn" type="button" disabled={locked} onClick={() => setEditing(false)}>Back to application status</button>}
        </form>
      </> : <div className="industry-application__status">
        <span className="industry-application__status-icon">{receipt ? <Check aria-hidden size={28} /> : <Clock3 aria-hidden size={28} />}</span>
        <h1 className="signup-split-form__title">{receipt ? "Application submitted" : copy?.title ?? "Application under review"}</h1>
        <p className="signup-split-form__subtitle">{receipt ? "Your details are saved. The Motiion team will review your application. You can check progress here anytime." : copy?.body}</p>
        {application?.feedback && <section className="industry-application__feedback" role="note"><h2>Feedback from Motiion</h2><p>{application.feedback}</p></section>}
        <p className="signup-split-hint">We’ll show review updates here. Return to this page to check your status.</p>
        <button className="signup-split-submit" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>{refreshing ? "Checking…" : "Check application status"}</button>
        <button className="signup-split-text-btn" onClick={() => { setReceipt(false); setEditing(true); navigate("identity"); }}>Update application</button>
        {error && <p className="signup-split-error" role="alert">{error}</p>}
      </div>}
      <footer className="industry-application__footer"><a className="signup-split-text-btn" href={returnHref}>Back to Motiion</a><button className="signup-split-text-btn" disabled={locked} onClick={signOut}>{signingOut ? "Signing out…" : "Sign out"}</button>{signOutError ? <p role="alert" className="signup-split-error">{signOutError}</p> : null}</footer>
    </div>
  </SignupSplitShell>;
}
