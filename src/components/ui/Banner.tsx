import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";

export type BannerTone = "success" | "info" | "warning" | "critical";

const ICONS = { success: CheckCircle2, info: Info, warning: AlertTriangle, critical: OctagonAlert } as const;

/** Page-level status message: tinted surface, title, optional body and action. */
export function Banner({ tone = "info", title, children, action, icon, className = "" }: {
  tone?: BannerTone;
  title: ReactNode;
  children?: ReactNode;
  /** Usually one `ui-banner__action` link or button. */
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const Icon = ICONS[tone];
  return (
    <div className={`ui-banner ${className}`.trim()} data-tone={tone} role={tone === "critical" ? "alert" : "status"}>
      <span className="ui-banner__icon" aria-hidden>{icon ?? <Icon size={16} strokeWidth={2.4} />}</span>
      <div className="ui-banner__body">
        <p className="ui-banner__title">{title}</p>
        {children ? <div className="ui-banner__text">{children}</div> : null}
        {action ? <div className="ui-banner__actions">{action}</div> : null}
      </div>
    </div>
  );
}
