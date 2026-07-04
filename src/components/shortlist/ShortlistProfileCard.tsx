import type { PublicShortlistSubmission } from "@/types/publicShortlist";

function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

function portraitUrl(submission: PublicShortlistSubmission): string | null {
  return submission.headshotUrl ?? submission.headshotUrls?.[0] ?? null;
}

export function ShortlistProfileCard({
  submission,
  isTopCard,
  onPortraitTap,
}: {
  submission: PublicShortlistSubmission;
  isTopCard?: boolean;
  onPortraitTap?: () => void;
}) {
  const url = portraitUrl(submission);
  const skills = submission.skills.slice(0, 4);

  return (
    <>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="shortlist-deck-card__portrait" draggable={false} />
      ) : (
        <div className="shortlist-deck-card__portrait-fallback" aria-hidden>
          {initialsFor(submission.displayName)}
        </div>
      )}

      <div className="shortlist-deck-card__gradient" aria-hidden />

      <div className="shortlist-deck-card__footer">
        <div>
          <h2 className="shortlist-deck-card__name">{submission.displayName}</h2>
          <p className="shortlist-deck-card__rep">
            {submission.representation?.trim() || "Not represented"}
          </p>
        </div>

        {skills.length > 0 ? (
          <div className="shortlist-deck-card__skills">
            {skills.map((skill) => (
              <span key={skill} className="shortlist-deck-card__skill">
                {skill}
              </span>
            ))}
          </div>
        ) : null}

        {isTopCard && onPortraitTap ? (
          <button type="button" className="shortlist-deck-card__tap-hint" onClick={onPortraitTap}>
            Tap for full profile
          </button>
        ) : null}
      </div>
    </>
  );
}

export function submissionPortraitUrl(submission: PublicShortlistSubmission): string | null {
  return portraitUrl(submission);
}

export function submissionInitials(submission: PublicShortlistSubmission): string {
  return initialsFor(submission.displayName);
}
