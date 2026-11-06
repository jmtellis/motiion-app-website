import Link from "next/link";
import { FolderOpen } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyIllustration, type EmptyIllustrationName } from "./EmptyIllustration";

type EmptyAction = { label: string; href?: string; onClick?: () => void };

function ActionControl({ action, secondary = false }: { action: EmptyAction; secondary?: boolean }) {
  const className = `ui-button ui-state__action${secondary ? " ui-button--secondary" : ""}`;
  if (action.onClick) return <button type="button" className={className} onClick={action.onClick}>{action.label}</button>;
  if (action.href) return <Link className={className} href={action.href}>{action.label}</Link>;
  return null;
}

export function ProductEmptyState({ title, description, actionLabel, actionHref, onAction, secondaryAction, children, icon, illustration, compact = false }: {
  title: string; description?: string; actionLabel?: string; actionHref?: string; onAction?: () => void;
  secondaryAction?: EmptyAction; children?: ReactNode; icon?: ReactNode;
  /** Spot illustration shown instead of the icon badge. */
  illustration?: EmptyIllustrationName;
  /** Tighter spacing for empty sections inside a page. */
  compact?: boolean;
}) {
  const primary = actionLabel ? { label: actionLabel, href: actionHref, onClick: onAction } : null;
  return (
    <section className={`ui-state${illustration ? " ui-state--illustrated" : ""}${compact ? " ui-state--compact" : ""}`}>
      {illustration ? <EmptyIllustration name={illustration} /> : <span className="ui-state__icon" aria-hidden>{icon ?? <FolderOpen size={22} />}</span>}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
      {primary || secondaryAction ? (
        <div className="ui-state__actions">
          {primary ? <ActionControl action={primary} /> : null}
          {secondaryAction ? <ActionControl action={secondaryAction} secondary /> : null}
        </div>
      ) : null}
    </section>
  );
}
