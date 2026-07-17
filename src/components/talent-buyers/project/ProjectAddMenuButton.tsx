"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { getProjectAddMenuActions } from "@/lib/talent-buyers/project-quick-actions";
import { projectOverviewPath, projectTabPath } from "@/lib/talent-buyers/project-routes";
import type { ProjectQuickAction } from "@/lib/talent-buyers/project-workspace-config";

import { CreateCastingModal } from "./CreateCastingModal";
import { CreateScheduledActivityModal } from "./CreateScheduledActivityModal";

import "./project-workspace.css";

export function ProjectAddMenuButton({
  projectId,
  projectType,
  triggerClassName = "bd-btn-accent",
  triggerLabel = "Add",
}: {
  projectId: string;
  projectType: string | null;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [castingOpen, setCastingOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const actions = getProjectAddMenuActions(projectType);

  function handleSelect(action: ProjectQuickAction) {
    setPickerOpen(false);

    switch (action.action.kind) {
      case "timeline-item":
        setTimelineOpen(true);
        return;
      case "casting":
        setCastingOpen(true);
        return;
      case "add-talent":
        router.push(`/talent?projectId=${projectId}`);
        return;
      case "navigate":
        if (action.action.href === "files") {
          router.push(projectTabPath(projectId, "files"));
        } else if (action.action.href === "timeline") {
          router.push(projectOverviewPath(projectId));
        } else {
          router.push(projectTabPath(projectId, "overview"));
        }
        return;
      case "placeholder":
        // Unfinished handler — surface a clear notice rather than fake data.
        setNotice(`${action.label} is not available yet.`);
        return;
    }
  }

  return (
    <>
      <button
        type="button"
        className={`${triggerClassName} gap-1.5`}
        onClick={() => setPickerOpen(true)}
        aria-label="Add to project"
      >
        <Plus className="size-4 shrink-0" aria-hidden />
        {triggerLabel}
      </button>

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add to project"
        description="Choose an action for this project type."
        size="sm"
      >
        <div className="project-add-option-list" role="list">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="project-add-option"
              onClick={() => handleSelect(action)}
            >
              <span className="project-add-option__copy">
                <span className="project-add-option__label">{action.label}</span>
                {action.description ? (
                  <span className="project-add-option__description">{action.description}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={Boolean(notice)} onClose={() => setNotice(null)} title="Coming later" size="sm">
        <p className="project-workspace__empty-text">{notice}</p>
      </Modal>

      <CreateCastingModal projectId={projectId} open={castingOpen} onClose={() => setCastingOpen(false)} />

      {timelineOpen ? (
        <CreateScheduledActivityModal
          projectId={projectId}
          activityType="session"
          open={timelineOpen}
          onClose={() => setTimelineOpen(false)}
        />
      ) : null}
    </>
  );
}

/** Reusable project-aware empty state for workspace panels. */
export function ProjectWorkspaceEmpty({
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  children,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  children?: ReactNode;
}) {
  return (
    <div className="project-workspace__empty">
      <p className="project-workspace__empty-title">{title}</p>
      <p className="project-workspace__empty-text">{description}</p>
      {children}
      {actionLabel && onAction ? (
        <button type="button" className="bd-btn-accent mt-4" onClick={onAction}>
          {actionLabel}
        </button>
      ) : actionLabel && actionHref ? (
        <Link href={actionHref} className="bd-btn-accent mt-4 inline-flex">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
