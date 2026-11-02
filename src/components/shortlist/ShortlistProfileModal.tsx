"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Instagram, Maximize, X } from "lucide-react";
import { shortlistInstagramUrl } from "@/lib/shortlist-review";
import type { PublicShortlistSubmission } from "@/types/publicShortlist";
import { submissionInitials, submissionPortraitUrl } from "./ShortlistProfileCard";
import "./shortlist-quickview.css";

type Props = {
  submission: PublicShortlistSubmission;
  submissions?: PublicShortlistSubmission[];
  onNavigate?: (submission: PublicShortlistSubmission) => void;
  onClose: () => void;
};

function CompactTags({ label, values }: { label?: string; values: string[] }) {
  if (!values.length) return null;
  const tags = (items: string[]) => <div className="sq-tags">{items.map((item) => <span key={item}>{item}</span>)}</div>;
  return <section className="sq-tag-section">{label && <h3>{label}</h3>}{tags(values.slice(0, 5))}{values.length > 5 && <details><summary>Show {values.length - 5} more</summary>{tags(values.slice(5))}</details>}</section>;
}

export function ShortlistProfileModal({ submission, submissions = [submission], onNavigate, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lightbox = useRef<HTMLDialogElement>(null);
  const details = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const portrait = submissionPortraitUrl(submission);
  const instagram = shortlistInstagramUrl(submission.instagramUrl);
  const position = submissions.findIndex((person) => person.id === submission.id);
  const highlights = submission.highlights?.length ? submission.highlights : (submission.experiences ?? []).slice(0, 3).map((item) => ({ title: item.title, subtitle: item.role || item.credits, imageUrl: item.imageUrl }));
  const fullProfile = submission.talentId ? `https://www.motiion.app/profile/${encodeURIComponent(submission.talentId)}` : null;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const y = window.scrollY;
    const style = document.body.getAttribute("style");
    Object.assign(document.body.style, { position: "fixed", top: `-${y}px`, width: "100%", overflow: "hidden" });
    dialog.current?.showModal();
    return () => {
      if (style === null) document.body.removeAttribute("style"); else document.body.setAttribute("style", style);
      window.scrollTo({ top: y, behavior: "instant" });
      previous?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => { details.current?.scrollTo({ top: 0 }); }, [submission.id]);
  useEffect(() => { if (expanded) lightbox.current?.showModal(); }, [expanded]);
  const profileAction = fullProfile && <a className="sq-primary" href={fullProfile} target="_blank" rel="noopener noreferrer">View full profile <ArrowUpRight size={16} /></a>;

  return <>
    <dialog ref={dialog} className="shortlist-quickview" data-lenis-prevent aria-labelledby="shortlist-profile-title" onCancel={(event) => { event.preventDefault(); closeRef.current(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <button className="sq-close" onClick={onClose} aria-label="Close profile"><X size={20} /></button>
      <div className="sq-detail">
        <div className="sq-portrait">{portrait ? <button aria-label="Enlarge headshot" onClick={() => setExpanded(true)}><img src={portrait} alt={submission.displayName} /><span><Maximize size={20} /></span></button> : <div className="sq-fallback">{submissionInitials(submission)}</div>}</div>
        <div className="sq-bio">
          <div className="sq-identity"><h2 id="shortlist-profile-title">{submission.displayName}</h2><p>{[submission.location, submission.height].filter(Boolean).join(" · ")}</p></div>
          <div ref={details} className="sq-content">
            <div className="sq-tags">{[submission.representation, submission.unionStatus].filter(Boolean).map((item) => <span key={item}>{item}</span>)}</div>
            {highlights.length > 0 && <section className="sq-highlights"><h3>Selected highlights</h3><ul>{highlights.map((item, index) => <li key={index}>{item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" />}<div><strong>{item.title}</strong>{item.subtitle && <span>{item.subtitle}</span>}</div></li>)}</ul></section>}
            <CompactTags label="Genres" values={submission.styles ?? []} />
            <CompactTags values={submission.skills} />
            {instagram && <a className="sq-instagram" href={instagram} target="_blank" rel="noopener noreferrer"><Instagram size={20} /> Instagram <ArrowUpRight size={16} /></a>}
            <div className="sq-desktop-action">{profileAction}</div>
          </div>
        </div>
      </div>
      {profileAction && <div className="sq-mobile-action">{profileAction}</div>}
      <nav className="sq-navigation" aria-label="Browse profiles in this role"><button aria-label="Previous profile" disabled={position <= 0 || !onNavigate} onClick={() => onNavigate?.(submissions[position - 1])}><ArrowLeft size={18} /></button><span>{position + 1} of {submissions.length}</span><button aria-label="Next profile" disabled={position < 0 || position >= submissions.length - 1 || !onNavigate} onClick={() => onNavigate?.(submissions[position + 1])}><ArrowRight size={18} /></button></nav>
    </dialog>
    {expanded && <dialog ref={lightbox} className="shortlist-lightbox" data-lenis-prevent aria-label={`${submission.displayName} — Headshot`} onCancel={(event) => { event.preventDefault(); setExpanded(false); }} onClick={(event) => { if (event.target === event.currentTarget) setExpanded(false); }}><img src={portrait!} alt={submission.displayName} /><button onClick={() => setExpanded(false)}>Close</button></dialog>}
  </>;
}
