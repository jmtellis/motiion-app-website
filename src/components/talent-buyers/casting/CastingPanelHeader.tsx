import type { ReactNode } from "react";

import type { CastingPrimaryAction } from "@/lib/talent-buyers/casting/casting-navigation";

type CastingPanelHeaderProps = {
  /** @deprecated Tabs serve as the page title — kept for call-site compatibility. */
  title?: string;
  /** @deprecated Tabs serve as the page title — kept for call-site compatibility. */
  description?: string;
  center?: ReactNode;
  primaryAction?: CastingPrimaryAction;
  onPrimaryAction?: (actionId: string) => void;
  overflowActions?: ReactNode;
};

export function CastingPanelHeader({ center, primaryAction, onPrimaryAction, overflowActions }: CastingPanelHeaderProps) {
  // The tab supplies the title; this toolbar retains each section's real controls.
  if (!center && !primaryAction && !overflowActions) return null;

  return (
    <div className="project-workspace__panel-header project-workspace__panel-header--controls">
      {center ? <div className="project-workspace__panel-header-center">{center}</div> : null}
      <div className="project-workspace__panel-actions ml-auto">
        {overflowActions}
        {primaryAction ? (
          <button type="button" className="bd-btn-accent text-sm" disabled={primaryAction.disabled || !onPrimaryAction}
            onClick={() => onPrimaryAction?.(primaryAction.actionId)}>
            {primaryAction.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
