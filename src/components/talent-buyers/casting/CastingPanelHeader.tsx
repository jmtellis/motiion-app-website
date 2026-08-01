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

export function CastingPanelHeader({ center }: CastingPanelHeaderProps) {
  // The tab itself is the page title. Casting-level actions live in the top chrome;
  // section-specific controls live inside their respective content sections.
  if (!center) return null;

  return (
    <div className="project-workspace__panel-header project-workspace__panel-header--controls">
      <div className="project-workspace__panel-header-center">{center}</div>
    </div>
  );
}
