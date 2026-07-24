import Link from "next/link";
import { Image as ImageIcon } from "lucide-react";

import { BuyerEmptyIntro } from "@/components/talent-buyers/dashboard/BuyerEmptyIntro";

function GhostCollectionCard() {
  return (
    <div className="buyer-empty__card library-empty-ghost-card" aria-hidden>
      <div className="library-empty-ghost-card__media">
        <ImageIcon className="library-empty-ghost-card__icon" aria-hidden />
      </div>
      <div className="buyer-empty__card-body">
        <span className="buyer-empty__bone buyer-empty__bone--title" />
        <span className="buyer-empty__bone buyer-empty__bone--type" />
        <span className="buyer-empty__bone buyer-empty__bone--line-mid" />
      </div>
    </div>
  );
}

function GhostTalentCard() {
  return (
    <div className="buyer-empty__card library-empty-ghost-talent" aria-hidden>
      <div className="library-empty-ghost-talent__media">
        <span className="buyer-empty__bone library-empty-ghost-talent__photo" />
      </div>
      <div className="buyer-empty__card-body">
        <span className="buyer-empty__bone buyer-empty__bone--title" />
        <span className="buyer-empty__bone buyer-empty__bone--line-short" />
      </div>
    </div>
  );
}

export function LibraryEmptyState({
  title,
  body,
  primaryLabel,
  primaryHref,
  primaryOnClick,
  secondaryLabel,
  secondaryHref,
  secondaryOnClick,
  variant = "simple",
}: {
  title: string;
  body: string;
  primaryLabel: string;
  primaryHref?: string;
  primaryOnClick?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  secondaryOnClick?: () => void;
  variant?: "simple" | "collections" | "talent";
}) {
  if (variant === "simple") {
    return (
      <div className="library-empty">
        <div>
          <h2 className="library-empty__title">{title}</h2>
          <p className="library-empty__body">{body}</p>
        </div>
        <div className="library-empty__actions">
          {primaryHref ? (
            <Link href={primaryHref} className="buyer-chrome-bar__cta">
              {primaryLabel}
            </Link>
          ) : (
            <button type="button" className="buyer-chrome-bar__cta" onClick={primaryOnClick}>
              {primaryLabel}
            </button>
          )}
          {secondaryLabel ? (
            secondaryHref ? (
              <Link href={secondaryHref} className="bd-btn-secondary">
                {secondaryLabel}
              </Link>
            ) : (
              <button type="button" className="bd-btn-secondary" onClick={secondaryOnClick}>
                {secondaryLabel}
              </button>
            )
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-empty library-empty-ghost">
      <BuyerEmptyIntro
        title={title}
        lede={body}
        primaryLabel={primaryLabel}
        primaryHref={primaryHref}
        primaryOnClick={primaryOnClick}
        secondaryLabel={secondaryLabel}
        secondaryHref={secondaryHref}
        secondaryOnClick={secondaryOnClick}
      />

      {variant === "collections" ? (
        <div className="library-collection-grid" aria-hidden>
          {Array.from({ length: 4 }, (_, index) => (
            <GhostCollectionCard key={index} />
          ))}
        </div>
      ) : (
        <div className="library-talent-grid" aria-hidden>
          {Array.from({ length: 8 }, (_, index) => (
            <GhostTalentCard key={index} />
          ))}
        </div>
      )}
    </div>
  );
}
