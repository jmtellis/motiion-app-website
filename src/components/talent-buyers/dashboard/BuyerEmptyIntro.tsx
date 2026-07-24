import type { ReactNode } from "react";
import Link from "next/link";

import "./buyer-empty.css";

export function BuyerEmptyIntro({
  title,
  lede,
  primaryLabel,
  primaryHref,
  primaryOnClick,
  secondaryLabel,
  secondaryHref,
  secondaryOnClick,
  spacer,
  children,
}: {
  title: string;
  lede?: string;
  primaryLabel?: string;
  primaryHref?: string;
  primaryOnClick?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  secondaryOnClick?: () => void;
  spacer?: boolean;
  children?: ReactNode;
}) {
  const actions =
    children ??
    (primaryLabel || secondaryLabel ? (
      <div className="buyer-empty__actions">
        {primaryLabel ? (
          primaryHref ? (
            <Link href={primaryHref} className="buyer-chrome-bar__cta">
              {primaryLabel}
            </Link>
          ) : (
            <button type="button" className="buyer-chrome-bar__cta" onClick={primaryOnClick}>
              {primaryLabel}
            </button>
          )
        ) : null}
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
    ) : null);

  return (
    <div
      className={`buyer-empty__intro${spacer ? " buyer-empty__intro--spacer" : ""}`}
      aria-hidden={spacer || undefined}
    >
      <div className="buyer-empty__intro-copy">
        <h2 className="buyer-empty__title">{title}</h2>
        {lede ? <p className="buyer-empty__lede">{lede}</p> : null}
      </div>
      {actions}
    </div>
  );
}
