import Link from "next/link";

export function LibraryEmptyState({
  title,
  body,
  primaryLabel,
  primaryHref,
  primaryOnClick,
  secondaryLabel,
  secondaryHref,
  secondaryOnClick,
}: {
  title: string;
  body: string;
  primaryLabel: string;
  primaryHref?: string;
  primaryOnClick?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  secondaryOnClick?: () => void;
}) {
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
