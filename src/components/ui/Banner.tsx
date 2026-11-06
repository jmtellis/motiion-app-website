import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";

export type BannerTone = "success" | "info" | "warning" | "critical";

const ICONS = { success: CheckCircle2, info: Info, warning: AlertTriangle, critical: OctagonAlert } as const;

/** Page-level status message: tinted surface, title, optional body and action. */
export function Banner({ tone = "info", title, children, action, icon, inline = false, className = "" }: {
  tone?: BannerTone;
  title: ReactNode;
  children?: ReactNode;
  /** Usually one `ui-banner__action` link or button. */
  action?: ReactNode;
  icon?: ReactNode;
  /** Places the action on the trailing edge instead of under the text. */
  inline?: boolean;
  className?: string;
}) {
  const Icon = ICONS[tone];
  const actions = action ? <div className="ui-banner__actions">{action}</div> : null;
  return (
    <div className={`ui-banner ${className}`.trim()} data-tone={tone} data-inline={inline || undefined} role={tone === "critical" ? "alert" : "status"}>
      <span className="ui-banner__icon" aria-hidden>{icon ?? <Icon size={16} strokeWidth={2.4} />}</span>
      <div className="ui-banner__body">
        <p className="ui-banner__title">{title}</p>
        {children ? <div className="ui-banner__text">{children}</div> : null}
        {inline ? null : actions}
      </div>
      {inline ? actions : null}
    </div>
  );
}
