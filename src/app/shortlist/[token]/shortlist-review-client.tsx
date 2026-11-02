"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronRight, Instagram, X } from "lucide-react";
import { useSmoothScroll } from "@/components/landing/SmoothScroll";
import { ShortlistShareDetails } from "@/components/shortlist/ShortlistShareDetails";
import { BrowserThemeColor } from "@/components/landing/BrowserThemeColor";
import { ShortlistProfileModal } from "@/components/shortlist/ShortlistProfileModal";
import { submissionInitials, submissionPortraitUrl } from "@/components/shortlist/ShortlistProfileCard";
import { fetchPublicShortlist, PublicShortlistError, submitShortlistVotes } from "@/lib/publicShortlist";
import { groupShortlistByRole, shortlistInstagramUrl } from "@/lib/shortlist-review";
import { trackClientEvent } from "@/lib/analytics/track-client";
import type { PublicShortlistPayload, PublicShortlistSubmission, PublicShortlistVote } from "@/types/publicShortlist";
import "@/app/shortlist/shortlist.css";

export default function ShortlistReviewClient({ token }: { token: string }) {
  const [payload, setPayload] = useState<PublicShortlistPayload | null>(null);
  const [name, setName] = useState("");
  const [reviewer, setReviewer] = useState<{ id: string; name: string } | null>(null);
  const [votes, setVotes] = useState<Record<string, PublicShortlistVote>>({});
  const [preview, setPreview] = useState<PublicShortlistSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeRole, setActiveRole] = useState(0);
  const [reviewingSummary, setReviewingSummary] = useState(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const stepNavigation = useRef<HTMLElement>(null);

  const canvas = useRef<HTMLDivElement>(null);
  const markExpired = useCallback(() => { setExpired(true); setError("This review link has expired. Ask the sender for a new link."); }, []);
  useSmoothScroll({ enabled: !preview });
  useEffect(() => {
    if (preview) return;
    const root = canvas.current;
    if (!root) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const remaining = Math.max(0, document.documentElement.scrollHeight - window.innerHeight - window.scrollY);
      const progress = Math.max(0, Math.min(1, 1 - remaining / (window.innerWidth <= 600 ? 110 : 180)));
      root.style.setProperty("--wordmark-reveal", String(progress * progress * (3 - 2 * progress)));
      root.classList.toggle("is-scrolled", window.scrollY > 2);
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    const observer = new ResizeObserver(queue); observer.observe(root);
    update();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", queue); window.removeEventListener("resize", queue); };
  }, [preview]);

  function changeStep(index: number, summary = false) {
    setActiveRole(index);
    setReviewingSummary(summary);
    requestAnimationFrame(() => {
      stepHeading.current?.focus({ preventScroll: true });
      stepNavigation.current?.scrollIntoView({ block: "start" });
      stepNavigation.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPayload(null);
    setReviewer(null);
    setName("");
    setVotes({});
    setActiveRole(0);
    setReviewingSummary(false);
    setSubmitted(false);
    setExpired(false);
    setError(null);
    fetchPublicShortlist(token).then((data) => {
      if (cancelled) return;
      setPayload(data);
      trackClientEvent("shortlist_viewed", { project_title: data.share.projectTitle, role_title: data.share.roleTitle }, `/shortlist/${encodeURIComponent(token)}`);
    }).catch((err) => {
      if (cancelled) return;
      setExpired(err instanceof PublicShortlistError && err.status === 410);
      setError(err instanceof Error ? err.message : "Unable to load this shortlist.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const groups = groupShortlistByRole(payload?.submissions ?? [], payload?.share.roleTitle ?? "Role");
  const total = payload?.submissions.length ?? 0;
  const reviewed = Object.keys(votes).length;
  const selected = Object.values(votes).filter((vote) => vote === "yes").length;
  const canSubmit = Boolean(reviewer) && total > 0 && reviewed === total && !submitting && !expired;

  const currentGroup = groups[activeRole];
  const roleRemaining = currentGroup?.submissions.filter((person) => !votes[person.id]).length ?? 0;

  async function submit() {
    if (!canSubmit || !reviewer || !reviewingSummary) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitShortlistVotes({ token, recipientId: reviewer.id, reviewerName: reviewer.name,
        votes: Object.entries(votes).map(([submissionId, vote]) => ({ submissionId, vote })) });
      if (!result.success || result.submittedCount !== total) throw new Error("Your full review could not be saved. Please try again.");
      setSubmitted(true);
      trackClientEvent("shortlist_submitted", { vote_count: total, confirm_count: selected, reject_count: total - selected }, `/shortlist/${encodeURIComponent(token)}`);
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch (err) {
      setExpired(err instanceof PublicShortlistError && err.status === 410);
      setError(err instanceof Error ? err.message : "Unable to submit. Your choices are still here; please try again.");
    } finally { setSubmitting(false); }
  }

  return <div ref={canvas} className={`shortlist-review${submitted ? " shortlist-review--delivered" : ""}${payload && !reviewer && !submitted ? " shortlist-review--entry" : ""}`}>
    <BrowserThemeColor color="#eeefeb" />
    <main className="shortlist-review__main">
      <header className="shortlist-review__header">
        {payload && reviewer && !submitted ? <div className="shortlist-header-identity">
          <h1>{payload.share.projectTitle}</h1>
          <div>Reviewing as <strong>{reviewer.name}</strong><button disabled={submitting} onClick={() => { setReviewer(null); setError(null); }}>Change</button></div>
        </div> : <a href="https://www.motiion.app" aria-label="Motiion home"><img src="/shared-roster/brand-wordmark.svg" alt="Motiion" width="120" height="30" /></a>}
        {payload && <ShortlistShareDetails share={payload.share} onExpire={markExpired} />}
      </header>
      {loading ? <div className="shortlist-review__notice" role="status">Loading your shortlist…</div>
        : !payload ? <section className="shortlist-review__notice"><p className="shortlist-entry-label">Shortlist review</p><h1>{expired ? "This link has expired" : "Shortlist unavailable"}</h1><p>{expired ? "Ask the sender for a new review link." : error}</p></section>
        : submitted ? <section className="shortlist-review__notice"><span className="shortlist-success"><Check size={28} /></span><p className="shortlist-eyebrow">{payload.share.projectTitle}</p><h1>Review delivered.</h1><p>Thank you, {reviewer?.name}. Your choices have been sent to the casting team.</p><div className="shortlist-summary">{selected} selected · {total - selected} passed · {groups.length} {groups.length === 1 ? "role" : "roles"}</div></section>
        : <>
          {!total ? <section className="shortlist-review__notice"><h2>No profiles yet</h2><p>The casting team hasn’t added talent to this shortlist yet.</p></section>
            : !reviewer ? <section className="shortlist-review__welcome">
              <p className="shortlist-entry-label">Shortlist review</p>
              <h1>{payload.share.projectTitle}</h1>
              <p id="reviewer-help">Add your name so the casting team knows who made these choices.</p>
              <form onSubmit={(event) => {
                event.preventDefault();
                if (!name.trim()) { setError("Please enter your name to begin."); return; }
                setReviewer({ id: crypto.randomUUID(), name: name.trim() }); setError(null);
              }}>
                <label htmlFor="reviewer-name">Your name</label>
                <input id="reviewer-name" name="name" autoComplete="name" placeholder="Enter your name" required maxLength={120} value={name} onChange={(event) => { setName(event.target.value); setError(null); }} aria-describedby="reviewer-help" />
                <button className="shortlist-primary" type="submit">Start reviewing <ArrowUpRight size={18} /></button>
              </form>
            </section>
            : <>
              <nav ref={stepNavigation} className="shortlist-stepbar" aria-label="Review steps">
                <ol className="shortlist-steps">
                  {groups.map((group, index) => <li key={group.id}>
                    <button type="button" aria-current={!reviewingSummary && index === activeRole ? "step" : undefined} disabled={submitting} onClick={() => changeStep(index)}>{group.title}</button>
                    <ChevronRight size={14} aria-hidden="true" />
                  </li>)}
                  <li><button type="button" aria-current={reviewingSummary ? "step" : undefined} disabled={submitting} onClick={() => changeStep(activeRole, true)}>Review &amp; submit</button></li>
                </ol>
                <select className="shortlist-step-select" aria-label="Current review step" value={reviewingSummary ? "summary" : String(activeRole)} disabled={submitting} onChange={(event) => event.target.value === "summary" ? changeStep(activeRole, true) : changeStep(Number(event.target.value))}>
                  {groups.map((group, index) => <option key={group.id} value={index}>{index + 1}. {group.title}</option>)}
                  <option value="summary">{groups.length + 1}. Review &amp; submit</option>
                </select>
                <span className="shortlist-step-progress" aria-live="polite">{reviewed}/{total} reviewed</span>
              </nav>
              {payload.share.message?.trim() && <details className="shortlist-sender-note"><summary>Note from the sender</summary><p>{payload.share.message}</p></details>}
              {!reviewingSummary && groups.slice(activeRole, activeRole + 1).map((group) => <section key={group.id} id={`role-${group.id}`} className="shortlist-role"><div className="shortlist-role__heading"><div><h2 ref={stepHeading} tabIndex={-1}>{group.title}</h2></div><p>{group.submissions.filter((person) => votes[person.id] === "yes").length} selected · {group.submissions.length} profiles</p></div><div className="shortlist-review__grid">{group.submissions.map((person) => {
                const portrait = submissionPortraitUrl(person);
                const instagram = shortlistInstagramUrl(person.instagramUrl);
                return <article className="shortlist-talent" key={person.id}>
                  <button className="shortlist-talent__portrait" onClick={() => setPreview(person)} aria-label={`View ${person.displayName}’s profile for ${group.title}`}>{portrait ? <img src={portrait} alt={person.displayName} loading="lazy" /> : <span>{submissionInitials(person)}</span>}{votes[person.id] && <span className="shortlist-talent__badge">{votes[person.id] === "yes" ? "Selected" : "Passed"}</span>}</button>
                  <div className="shortlist-talent__title-row">
                    <button className="shortlist-talent__name" onClick={() => setPreview(person)}><h3>{person.displayName}</h3></button>
                    {instagram && <a className="shortlist-talent__instagram" href={instagram} target="_blank" rel="noopener noreferrer" aria-label={`Open ${person.displayName}’s Instagram`} title="Instagram"><Instagram size={20} /></a>}
                  </div>
                  <p className="shortlist-talent__meta">{[person.location, person.representation].filter(Boolean).join(" · ") || "Independent talent"}</p>
                  <div className="shortlist-talent__votes" role="group" aria-label={`Choice for ${person.displayName}, ${group.title}`}>{(["no", "yes"] as const).map((vote) => <button key={vote} aria-pressed={votes[person.id] === vote} disabled={submitting || expired} onClick={() => setVotes((current) => ({ ...current, [person.id]: vote }))}>{vote === "yes" ? <Check size={16} /> : <X size={16} />}{vote === "yes" ? "Select" : "Pass"}</button>)}</div>
                </article>;
              })}</div></section>)}
              {reviewingSummary ? <section className="shortlist-review__ready">
                <h2 ref={stepHeading} tabIndex={-1}>Your cast, role by role.</h2>
                <p>{reviewed === total ? "Check your selections, then submit." : "Finish the remaining profiles before submitting."}</p>
                <div className="shortlist-final-roles">{groups.map((group, index) => {
                  const chosen = group.submissions.filter((person) => votes[person.id] === "yes");
                  const passed = group.submissions.filter((person) => votes[person.id] === "no");
                  const remaining = group.submissions.length - chosen.length - passed.length;
                  return <section className="shortlist-final-role" key={group.id}>
                    <div className="shortlist-role__heading"><div><h3>{group.title}</h3><p>{chosen.length} selected · {passed.length} passed{remaining > 0 && ` · ${remaining} remaining`}</p></div><button disabled={submitting} onClick={() => changeStep(index)}>{remaining ? "Finish role" : "Edit choices"} <ArrowUpRight size={14} /></button></div>
                    {chosen.length ? <ul className="shortlist-final-people">{chosen.map((person) => <li key={person.id}><button onClick={() => setPreview(person)}>{submissionPortraitUrl(person) ? <img src={submissionPortraitUrl(person)!} alt="" /> : <span className="shortlist-final-initials">{submissionInitials(person)}</span>}<span>{person.displayName}</span><ArrowUpRight size={16} /></button></li>)}</ul> : <p>{remaining ? "No selections yet." : "No one selected for this role."}</p>}
                    {passed.length > 0 && <details><summary>View {passed.length} passed {passed.length === 1 ? "profile" : "profiles"}</summary><p>{passed.map((person) => person.displayName).join(", ")}</p></details>}
                  </section>;
                })}</div>
              </section> : null}
              <div className="shortlist-review__submit">
                <div><strong>{reviewingSummary ? `${selected} selected` : `${currentGroup?.submissions.filter((person) => votes[person.id] === "yes").length ?? 0} selected for this role`}</strong><span>{reviewingSummary ? (reviewed === total ? `Ready to send as ${reviewer.name}` : `${total - reviewed} profiles left to review`) : (roleRemaining ? `${roleRemaining} left to review` : "Role complete")}</span></div>
                {reviewingSummary ? <button className="shortlist-primary" disabled={!canSubmit} onClick={submit}>{submitting ? "Sending…" : "Submit review"}<ArrowUpRight size={18} /></button> : <button className="shortlist-primary" disabled={submitting} onClick={() => activeRole < groups.length - 1 ? changeStep(activeRole + 1) : changeStep(activeRole, true)}>{activeRole < groups.length - 1 ? "Next role" : "Review choices"}<ArrowUpRight size={18} /></button>}
              </div>
            </>}
          {error && <p className="shortlist-review__error" role="alert">{error}</p>}
        </>}
      {(reviewer || submitted || !payload) && <footer className="shortlist-review__footer"><span>Made for the people<br />who move us.</span><span>Motiion / Shortlist review</span></footer>}
    </main>
    {(reviewer || submitted || !payload) && <div className="shortlist-review__wordmark" aria-hidden="true"><img src="/shared-roster/brand-wordmark.svg" alt="" /></div>}
    {preview && <ShortlistProfileModal submission={preview} submissions={reviewingSummary ? payload?.submissions : currentGroup?.submissions} onNavigate={setPreview} onClose={() => setPreview(null)} />}
  </div>;
}
