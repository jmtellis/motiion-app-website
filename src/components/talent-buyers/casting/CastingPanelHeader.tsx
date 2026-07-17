"use client";

import type { ReactNode } from "react";

import type { CastingPrimaryAction } from "@/lib/talent-buyers/casting/casting-navigation";

export function CastingPanelHeader({
  title,
  description,
  center,
  primaryAction,
  onPrimaryAction,
  overflowActions,
}: {
  title: string;
  description?: string;
  center?: ReactNode;
  primaryAction?: CastingPrimaryAction;
  onPrimaryAction?: (actionId: string) => void;
  overflowActions?: ReactNode;
}) {
  return (
    <header className="project-workspace__panel-header">
      <div className="project-workspace__panel-header-start">
        <div className="project-workspace__panel-header-title-row">
          <h2 className="project-workspace__panel-title">{title}</h2>
          {center ? <div className="project-workspace__panel-header-center">{center}</div> : null}
        </div>
        {description ? <p className="project-workspace__panel-description">{description}</p> : null}
      </div>
      <div className="project-workspace__panel-actions flex items-center gap-2">
        {overflowActions}
        {primaryAction ? (
          <button
            type="button"
            className="bd-btn-accent"
            disabled={primaryAction.disabled}
            onClick={() => onPrimaryAction?.(primaryAction.actionId)}
          >
            {primaryAction.label}
          </button>
        ) : null}
      </div>
    </header>
  );
}
