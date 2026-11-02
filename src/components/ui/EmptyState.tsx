import Link from "next/link";
import { FolderOpen } from "lucide-react";
import type { ReactNode } from "react";

export function ProductEmptyState({ title, description, actionLabel, actionHref, onAction, children, icon }: {
  title: string; description?: string; actionLabel?: string; actionHref?: string; onAction?: () => void; children?: ReactNode; icon?: ReactNode;
}) {
  return (
    <section className="ui-state">
      <span className="ui-state__icon" aria-hidden>{icon ?? <FolderOpen size={22} />}</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
      {actionLabel && onAction ? <button type="button" className="ui-button ui-state__action" onClick={onAction}>{actionLabel}</button>
        : actionLabel && actionHref ? <Link className="ui-button ui-state__action" href={actionHref}>{actionLabel}</Link> : null}
    </section>
  );
}
