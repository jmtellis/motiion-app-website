"use client";

import { Calendar, Clapperboard, GraduationCap, Plus, Users, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import {
  getProjectAddOptions,
  type ProjectAddOption,
  type ProjectAddOptionIcon,
  type ScheduledActivityType,
} from "@/lib/talent-buyers/project-add-options";

import { CreateCastingModal } from "./CreateCastingModal";
import { CreateScheduledActivityModal } from "./CreateScheduledActivityModal";

import "./project-workspace.css";

const OPTION_ICONS: Record<ProjectAddOptionIcon, LucideIcon> = {
  clapperboard: Clapperboard,
  "graduation-cap": GraduationCap,
  users: Users,
  calendar: Calendar,
};

function ProjectAddOptionRow({
  option,
  onSelect,
}: {
  option: ProjectAddOption;
  onSelect: (option: ProjectAddOption) => void;
}) {
  const Icon = OPTION_ICONS[option.icon];

  return (
    <button type="button" className="project-add-option" onClick={() => onSelect(option)}>
      <span className="project-add-option__icon" aria-hidden>
        <Icon className="size-4" />
      </span>
      <span className="project-add-option__copy">
        <span className="project-add-option__label">{option.label}</span>
        <span className="project-add-option__description">{option.description}</span>
      </span>
    </button>
  );
}

export function AddProjectActivityButton({
  projectId,
  triggerClassName = "bd-btn-accent",
  triggerLabel = "Add",
  showPlusIcon = true,
}: {
  projectId: string;
  triggerClassName?: string;
  triggerLabel?: string;
  showPlusIcon?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [castingOpen, setCastingOpen] = useState(false);
  const [scheduledType, setScheduledType] = useState<ScheduledActivityType | null>(null);
  const options = getProjectAddOptions();

  function handleSelect(option: ProjectAddOption) {
    setPickerOpen(false);

    if (option.action.kind === "casting") {
      setCastingOpen(true);
      return;
    }

    setScheduledType(option.action.activityType);
  }

  return (
    <>
      <button
        type="button"
        className={`${triggerClassName}${showPlusIcon ? " gap-1.5" : ""}`}
        onClick={() => setPickerOpen(true)}
      >
        {showPlusIcon ? <Plus className="size-4 shrink-0" aria-hidden /> : null}
        {triggerLabel}
      </button>

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add to project"
        description="Choose what you want to add."
        size="sm"
      >
        <div className="project-add-option-list" role="list">
          {options.map((option) => (
            <ProjectAddOptionRow key={option.id} option={option} onSelect={handleSelect} />
          ))}
        </div>
      </Modal>

      <CreateCastingModal projectId={projectId} open={castingOpen} onClose={() => setCastingOpen(false)} />

      {scheduledType ? (
        <CreateScheduledActivityModal
          projectId={projectId}
          activityType={scheduledType}
          open={Boolean(scheduledType)}
          onClose={() => setScheduledType(null)}
        />
      ) : null}
    </>
  );
}
