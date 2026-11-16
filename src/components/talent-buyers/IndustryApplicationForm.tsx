"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock3, LoaderCircle, Camera, CircleCheck, ArrowLeft, ArrowRight } from "lucide-react";
import { useSignOut } from "@/hooks/use-sign-out";
import { submitIndustryApplication, uploadIndustryApplicationPhoto } from "@/app/talent-buyers/application/actions";
import { checkUsernameAvailability } from "@/app/onboarding/actions";
import { CenteredAuthShell } from "@/components/auth/CenteredAuthShell";
import { acquisitionSourceOptions } from "@/lib/talent/copy";
import { normalizeBirthDateInput } from "@/lib/onboarding/birth-date";
import { resizeImageFile } from "@/lib/onboarding/client-media";
import { parseIndustryProjects, serializeIndustryProjects, industryApplicationCopy, industryApplicationSteps, industryProjectOptions, parseIndustryApplicationDraft, validateIndustryApplicationStep, type IndustryApplication, type IndustryApplicationDraft, type IndustryApplicationStep } from "@/lib/talent-buyers/industry-application";
import { projectContextQuestions } from "@/lib/talent-buyers/project-context";
import { ApplicationTextInput } from "./ApplicationTextInput";
import { ApplicationMultiPicker } from "./ApplicationMultiPicker";
import { IndustryRolePicker } from "./IndustryRolePicker";
import { IndustryApplicationPreview } from "./IndustryApplicationPreview";
import "./industry-application.css";

const titles = { identity: "About you", work: "Your work", projects: "Your projects", acquisition: "How did you find us?", review: "Review your application" };
export function IndustryApplicationForm({ application, initial, userId }: {
  application: IndustryApplication | null; initial: IndustryApplicationDraft; userId: string;
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
  const copy = industryApplicationCopy[receipt ? "pending" : application?.status ?? "pending"];
  const index = industryApplicationSteps.indexOf(step);
  const projects = parseIndustryProjects(details.hiring_projects);
  const [moving, setMoving] = useState(false);
  const movingRef = useRef(false);
  const accountDisclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (event.target instanceof Node && accountDisclosure.current && !accountDisclosure.current.contains(event.target)) accountDisclosure.current.open = false; };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  const form = useRef<HTMLFormElement>(null);
  const intro = useRef<HTMLElement>(null);
  const locked = busy || uploading || signingOut || moving;
  const stepValid = !validateIndustryApplicationStep(step, { ...details, date_of_birth: normalizeBirthDateInput(details.date_of_birth) });
  const usernameReady = step !== "identity" || details.username === initial.username || (usernameResult?.username === details.username && usernameResult.available);
  const customRoleReady = step !== "work" || !details.professional_role.split("; ").includes("Other");
  const canContinue = hydrated && !locked && stepValid && usernameReady && customRoleReady;
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
  useEffect(() => { if (hydrated) { const heading = step === "review" ? document.getElementById("application-review-title") : title.current; window.scrollTo({ top: 0, behavior: "instant" }); heading?.focus({ preventScroll: true }); } }, [step, hydrated]);
  function update(key: keyof IndustryApplicationDraft, value: string) { setDetails(current => ({ ...current, [key]: value })); setError(null); }
  function updateBirthDate(part: number, value: string) {
    const parts = details.date_of_birth.split("-");
    const nextParts = [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
    nextParts[part] = value.replace(/[^0-9]/g, "");
    update("date_of_birth", nextParts.join("-"));
  }
  function padBirthDateDay() {
    const day = details.date_of_birth.split("-")[2];
    if (day) updateBirthDate(2, day.padStart(2, "0"));
  }
  async function navigate(next: IndustryApplicationStep) {
    if (movingRef.current) return;
    setError(null);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStep(next); return; }
    movingRef.current = true; setMoving(true);
    const direction = industryApplicationSteps.indexOf(next) > index ? 1 : -1;
    const nodes = [intro.current, form.current].filter((node): node is HTMLElement => Boolean(node));
    const exits = nodes.map(node => node.animate([{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: `translateY(${-12 * direction}px)` }], { duration: 140, easing: "ease-in", fill: "forwards" }));
    await Promise.all(exits.map(animation => animation.finished.catch(() => {})));
    setStep(next);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      exits.forEach(animation => animation.cancel());
      const entrances = nodes.map(node => node.animate([{ opacity: 0, transform: `translateY(${12 * direction}px)` }, { opacity: 1, transform: "translateY(0)" }], { duration: 220, easing: "ease-out" }));
      void Promise.all(entrances.map(animation => animation.finished.catch(() => {}))).finally(() => { movingRef.current = false; setMoving(false); });
    }));
  }
  function next() {
    const normalized = { ...details, date_of_birth: normalizeBirthDateInput(details.date_of_birth) };
    const validation = validateIndustryApplicationStep(step, normalized);
    if (validation) { setError(validation); return; }
    if (step === "identity" && details.username !== initial.username && (usernameResult?.username !== details.username || !usernameResult.available)) { setError(usernameResult?.message ?? "Please wait while we check your username."); return; }
    setDetails(normalized);
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
    return <label className="signup-split-field"><span className="industry-application__label-row"><span>{label}{options.optional ? " (optional)" : ""}</span>{key === "username" && /^[a-z0-9_]{3,30}$/.test(details.username) && <small role="status" className="industry-application__username-status" data-available={usernameResult?.username === details.username ? usernameResult.available : undefined}>{usernameResult?.username === details.username ? usernameResult.available ? "Available" : usernameResult.message.startsWith("Couldn’t") ? "Check failed" : "Unavailable" : "Checking…"}</small>}</span><ApplicationTextInput onClear={() => update(key, "")} aria-label={label} type={options.type ?? "text"} required={!options.optional} maxLength={options.max ?? 200} disabled={locked} value={details[key] ?? ""} autoComplete={key === "full_name" ? "name" : key === "contact_email" ? "email" : key === "username" ? "username" : undefined} onChange={event => update(key, key === "username" ? event.target.value.toLowerCase().replace(/^@/, "") : event.target.value)} />{options.help && <small className="signup-split-hint">{options.help}</small>}</label>;
  }
  const accountName = details.full_name.trim() || initial.full_name.trim() || "Your account";
  const nameParts = accountName.split(/\s+/);
  const accountInitials = (Array.from(nameParts[0])[0] + (nameParts.length > 1 ? Array.from(nameParts[nameParts.length - 1])[0] : "")).toLocaleUpperCase();
  const accountOptions = <details ref={accountDisclosure} className="industry-application__account" onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}><summary>Account</summary><div className="industry-application__account-menu">
    <div className="industry-application__account-profile"><span className="industry-application__account-avatar" aria-hidden>{details.avatar_url ? <Image src={details.avatar_url} alt="" width={40} height={40} unoptimized /> : accountInitials}</span><span className="industry-application__account-name">{accountName}</span></div>
    <hr className="industry-application__account-divider" />
    <button type="button" className="signup-split-text-btn" disabled={locked} onClick={signOut}>{signingOut ? "Signing out…" : "Sign out"}</button>{signOutError && <p role="alert" className="signup-split-error">{signOutError}</p>}</div></details>;
  if (!hydrated) return <CenteredAuthShell wide mode="signup" title="Industry application" subtitle="Apply for your professional workspace." showAlternateAuth={false}><p role="status" className="signup-split-hint">Restoring your application…</p></CenteredAuthShell>;
  return <CenteredAuthShell wide applicationLayout accountMenu={accountOptions} mode="signup" showHeading={false} footer={editing ? <div className="industry-application__bottom-bar">
    <div className="industry-application__back">{index > 0 && <button type="button" className="signup-split-text-btn" disabled={locked} onClick={() => navigate(industryApplicationSteps[index - 1])}><ArrowLeft size={16} aria-hidden /> Back</button>}</div>
    <p className="signup-split-hint industry-application__save-note" role="status">{storageAvailable && <CircleCheck size={14} aria-hidden />}<span>Step {index + 1} of {industryApplicationSteps.length} · {storageAvailable ? "All changes saved" : "Changes not saved — keep this page open"}</span></p>
    <div className="industry-application__actions"><button type="submit" form="industry-application-form" className="signup-split-submit" aria-busy={busy || uploading} disabled={!canContinue}>{busy ? "Submitting…" : uploading ? "Saving photo…" : step === "review" ? application ? "Save and resubmit" : "Submit application" : step === "acquisition" ? "Review application" : "Continue"}{busy || uploading ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <ArrowRight size={16} aria-hidden />}</button></div>
  </div> : undefined}>
    <div className={`industry-application${editing ? " industry-application--editing" : ""}${editing && step === "review" ? " industry-application--reviewing" : ""}`}>


      {editing ? <>
        <header ref={intro} className="industry-application__intro">
        <p className="industry-application__eyebrow">Industry application · {index + 1} of {industryApplicationSteps.length}</p>
        <h1 ref={title} tabIndex={-1} className="signup-split-form__title">{titles[step]}</h1>
        <p className="signup-split-form__subtitle">{step === "identity" ? "Let’s start with a few details about you." : step === "work" ? "Independent professionals and personal email addresses are welcome." : step === "projects" ? "What kinds of projects do you work on with dancers?" : step === "acquisition" ? "Help us understand how our community is growing." : "Check your details before sending them to the Motiion team."}</p>
        </header>
        <form ref={form} aria-busy={moving} id="industry-application-form" className="industry-application__form" onSubmit={event => { event.preventDefault(); if (!canContinue) return; if (step === "review") submit(); else next(); }}>
          {step === "identity" && <>
            <div className="industry-application__photo-row">
              <div className="industry-application__avatar">{details.avatar_url ? <Image src={details.avatar_url} alt="Your profile photo" width={88} height={88} unoptimized /> : <Camera aria-hidden size={28} />}</div>
              <label className="industry-application__upload"><span className="industry-application__upload-button">{uploading ? "Saving photo…" : details.avatar_url ? "Change photo" : "Add profile photo"}</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={locked} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /><small>JPG, PNG, or WebP · up to 12 MB</small></label>
            </div>
            <hr className="industry-application__divider industry-application__divider--photo" />
            <div className="industry-application__fields">
            {field("full_name", "Name", { help: "The name you use professionally." })}
            {field("username", "Username", { max: 30, help: "3–30 lowercase letters, numbers, or underscores." })}
            <hr className="industry-application__divider" />
            <fieldset className="industry-application__birthday" aria-describedby="birthday-help" disabled={locked}>
              <legend>Date of birth</legend>
              <div className="industry-application__birthday-fields">
                <label className="signup-split-field"><span>Month</span><select required autoComplete="bday-month" value={details.date_of_birth.split("-")[1] ?? ""} onChange={event => updateBirthDate(1, event.target.value)}><option value="" disabled>Month</option>{["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, i) => <option key={month} value={String(i + 1).padStart(2, "0")}>{month}</option>)}</select></label>
                <label className="signup-split-field"><span>Day</span><ApplicationTextInput onClear={() => updateBirthDate(2, "")} aria-label="Day" required inputMode="numeric" autoComplete="bday-day" placeholder="DD" maxLength={2} pattern="[0-9]{1,2}" value={details.date_of_birth.split("-")[2] ?? ""} onChange={event => updateBirthDate(2, event.target.value)} onBlur={() => padBirthDateDay()} /></label>
                <label className="signup-split-field"><span>Year</span><ApplicationTextInput onClear={() => updateBirthDate(0, "")} aria-label="Year" required inputMode="numeric" autoComplete="bday-year" placeholder="YYYY" maxLength={4} pattern="[0-9]{4}" value={details.date_of_birth.split("-")[0] ?? ""} onChange={event => updateBirthDate(0, event.target.value)} /></label>
              </div>
              <small id="birthday-help" className="signup-split-hint">Your birthday stays private. You must be at least 18.</small>
            </fieldset>
            </div>
          </>}
          {step === "work" && <div className="industry-application__fields industry-application__work-fields">
            <IndustryRolePicker value={details.professional_role} disabled={locked} onChange={value => update("professional_role", value)} />
            <hr className="industry-application__divider" />
            {field("organization", "Company", { help: "If you don’t work with a company, enter Independent." })}
            <hr className="industry-application__divider" />
            {field("contact_email", "Contact email", { type: "email", max: 320, help: "Use the email you check for work. Personal email addresses are welcome." })}
            {field("work_url", "Website, portfolio, or credits", { max: 2000, optional: true, help: "A public link such as yoursite.com helps us understand your work." })}
          </div>}
          {step === "projects" && <>
            <ApplicationMultiPicker label="Project types" placeholder="Select project types" searchPlaceholder="Search project types" help="Select all that apply." options={[...industryProjectOptions, "Other"]} selected={[...projects.selected, ...(projects.includesOther ? ["Other"] : [])]} disabled={locked} onToggle={option => update("hiring_projects", serializeIndustryProjects(option === "Other" ? { ...projects, includesOther: !projects.includesOther } : { ...projects, selected: projects.selected.includes(option) ? projects.selected.filter(value => value !== option) : [...projects.selected, option] }))} />
            {projects.includesOther && <label className="signup-split-field"><span>Other projects</span><textarea required maxLength={2800} rows={3} value={projects.other} disabled={locked} onChange={event => update("hiring_projects", serializeIndustryProjects({ ...projects, other: event.target.value }))} /></label>}
            <section className="industry-application__project-context" aria-label="Your typical workload">
              {projectContextQuestions.map(question => <fieldset key={question.key} disabled={locked} className="industry-application__context-question">
                <legend>{question.question}</legend>
                <div className="industry-application__context-options">{question.options.map(([value, label]) => <label key={value}><input type="radio" required name={question.key} value={value} checked={details[question.key] === value} onChange={() => update(question.key, value)} /><span>{label}</span></label>)}</div>
              </fieldset>)}
            </section>
          </>}
          {step === "acquisition" && <>
            <fieldset className="industry-application__context-question" disabled={locked}>
              <legend className="sr-only">How you heard about Motiion</legend>
              <div className="industry-application__context-options industry-application__source-options">{acquisitionSourceOptions.map(option => <label key={option.value}><input type="radio" required name="source" value={option.value} checked={details.acquisition_source === option.value} onChange={() => update("acquisition_source", option.value)} /><span>{option.label}</span></label>)}</div>
            </fieldset>
            <label className="signup-split-field industry-application__additional-details">
              <span>Anything else you’d like us to know? (optional)</span>
              <textarea rows={5} maxLength={2000} disabled={locked} value={details.acquisition_source_detail} onChange={event => update("acquisition_source_detail", event.target.value)} />
            </label>
          </>}
          {error && <p className="signup-split-error" role="alert">{error}</p>}

          {application && <button className="signup-split-text-btn" type="button" disabled={locked} onClick={() => setEditing(false)}>Back to application status</button>}
        </form>
        <IndustryApplicationPreview details={details} step={step} />
      </> : <div className="industry-application__status">
        <span className="industry-application__status-icon"><Clock3 aria-hidden size={26} /></span>
        <h1 className="signup-split-form__title">{copy.title}</h1>
        <p className="signup-split-form__subtitle">{copy.body}</p>
        {application?.feedback && <section className="industry-application__feedback" role="note"><h2>Feedback from Motiion</h2><p>{application.feedback}</p></section>}
        <div className="industry-application__status-actions">
        <button className="signup-split-submit" disabled={refreshing} aria-busy={refreshing} aria-label="Check application status" onClick={() => startRefresh(() => router.refresh())}>{refreshing && <LoaderCircle className="animate-spin" size={16} aria-hidden />}{refreshing ? "Checking status…" : "Check application status"}</button>
        <button className="signup-split-text-btn" onClick={() => { setReceipt(false); setEditing(true); navigate("identity"); }}>Update application</button>
        </div>
        {error && <p className="signup-split-error" role="alert">{error}</p>}
      </div>}
    </div>

  </CenteredAuthShell>;
}
