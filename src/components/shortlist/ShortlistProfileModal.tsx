"use client";

import type { PublicShortlistSubmission } from "@/types/publicShortlist";

import { submissionInitials, submissionPortraitUrl } from "./ShortlistProfileCard";

type ShortlistProfileModalProps = {
  submission: PublicShortlistSubmission;
  onClose: () => void;
};

export function ShortlistProfileModal({ submission, onClose }: ShortlistProfileModalProps) {
  const portrait = submissionPortraitUrl(submission);
  const metaLines = [
    submission.location,
    submission.height,
    submission.ethnicity,
    submission.gender,
  ].filter((line): line is string => Boolean(line?.trim()));

  return (
    <div
      className="shortlist-profile-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortlist-profile-title"
      onClick={onClose}
    >
      <div className="shortlist-profile-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="shortlist-profile-modal__close" onClick={onClose}>
          Close
        </button>

        <div className="shortlist-profile-modal__hero">
          {portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait} alt="" />
          ) : (
            <div className="shortlist-deck-card__portrait-fallback">{submissionInitials(submission)}</div>
          )}
        </div>

        <div className="shortlist-profile-modal__meta">
          <h2 id="shortlist-profile-title" className="public-review-page-title">
            {submission.displayName}
          </h2>
          <p className="public-review-subtitle">
            {submission.representation?.trim() || "Not represented"}
          </p>
          {metaLines.length > 0 ? (
            <p className="public-review-body">{metaLines.join(" · ")}</p>
          ) : null}
          {submission.bio?.trim() ? <p className="public-review-body">{submission.bio.trim()}</p> : null}
        </div>

        {submission.skills.length > 0 ? (
          <div>
            <h3 className="public-review-section-title">Skills</h3>
            <div className="shortlist-profile-modal__chips">
              {submission.skills.map((skill) => (
                <span key={skill} className="shortlist-profile-modal__chip">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {submission.experiences && submission.experiences.length > 0 ? (
          <div>
            <h3 className="public-review-section-title">Experience</h3>
            <div className="shortlist-profile-modal__experiences">
              {submission.experiences.map((experience) => (
                <article key={`${experience.title}-${experience.role ?? ""}`} className="shortlist-profile-modal__experience">
                  <p className="public-review-body" style={{ fontWeight: 600 }}>
                    {experience.title}
                  </p>
                  {experience.role ? <p className="public-review-subtitle">{experience.role}</p> : null}
                  {experience.credits ? <p className="public-review-subtitle">{experience.credits}</p> : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
