"use client";

import Link from "next/link";
import { useState } from "react";
import type { LibraryTalent } from "@/lib/talent-buyers/library";

/** Selection, inspection and removal are separate keyboard/touch targets. */
export function LibraryTalentCard({ talent, selected, selectable, onToggleSelect, onRemove, savedIndicator, onInspect }: {
  talent: LibraryTalent; selected?: boolean; selectable?: boolean; onToggleSelect?: () => void; onRemove?: () => void; savedIndicator?: boolean; onInspect?: () => void;
}) {
  const href = talent.slug ? `/talent/${talent.slug}` : `/talent/${talent.profileId}`;
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const content = <>
    <div className="library-talent-card__media">
      {talent.avatarUrl && failedImage !== talent.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={talent.avatarUrl} alt="" loading="lazy" decoding="async" onError={() => setFailedImage(talent.avatarUrl)} />
      ) : <div className="library-talent-card__fallback">{talent.name.slice(0, 1).toUpperCase()}</div>}
      <span className="library-talent-card__view">View profile</span>
    </div>
    <div className="library-talent-card__meta">
      <p className="library-talent-card__name">{talent.name}{savedIndicator ? <span className="library-talent-card__saved">Saved</span> : null}</p>
      <p className="library-talent-card__sub">{talent.location || "Location not added"}</p>
    </div>
  </>;
  return (
    <article className={`library-talent-card ${selected ? "library-talent-card--selected" : ""}`}>
      {selectable ? <input type="checkbox" className="library-talent-card__select" checked={Boolean(selected)} onChange={onToggleSelect} aria-label={`Select ${talent.name}`} /> : null}
      {onInspect ? <button type="button" className="library-talent-card__inspect" onClick={onInspect} aria-label={`View ${talent.name}’s profile`}>{content}</button>
        : <Link href={href} className="library-talent-card__inspect" aria-label={`View ${talent.name}’s profile`}>{content}</Link>}
      {onRemove ? <button type="button" className="library-talent-card__remove" onClick={onRemove} aria-label={`Remove ${talent.name} from this collection`}>Remove</button> : null}
    </article>
  );
}
