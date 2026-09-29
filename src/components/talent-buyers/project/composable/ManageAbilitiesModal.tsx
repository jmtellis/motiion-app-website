"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";

import {
  enableProjectAbilities,
  setProjectAbilityPaused,
} from "@/app/(buyer-app)/(paid)/projects/composable-actions";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import {
  PROJECT_ABILITIES,
  PROJECT_ABILITY_ORDER,
  sortAbilityIds,
  type ProjectAbilityId,
  type ProjectAbilityState,
} from "@/lib/talent-buyers/project-abilities";

import "./composable-project.css";

export function ManageAbilitiesModal({
  open,
  onClose,
  projectId,
  abilities,
  preselect = [],
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  abilities: ProjectAbilityState[];
  preselect?: ProjectAbilityId[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Set<ProjectAbilityId>>(new Set());
  const [pending, startTransition] = useTransition();
  const enabled = new Map(abilities.map((ability) => [ability.id, ability]));
  const available = PROJECT_ABILITY_ORDER.filter((id) => !enabled.has(id));

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelected(new Set(preselect.filter((id) => !enabled.has(id))));
  }

  function toggle(id: ProjectAbilityId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addSelected() {
    const ids = sortAbilityIds(selected);
    if (!ids.length) return;
    startTransition(async () => {
      const result = await enableProjectAbilities({ projectId, abilities: ids });
      if (!result.ok) {
        showToast({ message: result.error, variant: "error" });
        return;
      }
      showToast({
        message: `${ids.map((id) => PROJECT_ABILITIES[id].label).join(", ")} added`,
        variant: "success",
      });
      onClose();
      router.refresh();
    });
  }

  function togglePaused(ability: ProjectAbilityState) {
    startTransition(async () => {
      const paused = ability.status !== "paused";
      const result = await setProjectAbilityPaused({ projectId, ability: ability.id, paused });
      if (!result.ok) {
        showToast({ message: result.error, variant: "error" });
        return;
      }
      showToast({
        message: `${PROJECT_ABILITIES[ability.id].label} ${paused ? "paused" : "resumed"}`,
        variant: "success",
      });
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => (pending ? undefined : onClose())}
      title="Abilities"
      description="Add the tools this project needs. Pause one to keep its data without working in it."
      size="lg"
      footer={
        available.length ? (
          <div className="composable-sheet__footer">
            <button type="button" className="bd-btn-secondary" onClick={onClose} disabled={pending}>
              Done
            </button>
            <button
              type="button"
              className="buyer-chrome-bar__cta"
              onClick={addSelected}
              disabled={pending || selected.size === 0}
            >
              {pending ? "Saving…" : selected.size > 1 ? `Add ${selected.size} abilities` : "Add ability"}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="ability-manager">
        {available.length ? (
          <section aria-labelledby="ability-manager-add">
            <h3 id="ability-manager-add" className="ability-manager__heading">
              Add
            </h3>
            <div className="ability-choice-grid">
              {available.map((id) => {
                const definition = PROJECT_ABILITIES[id];
                const Icon = definition.icon;
                const isSelected = selected.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`ability-choice${isSelected ? " ability-choice--selected" : ""}`}
                    aria-pressed={isSelected}
                    onClick={() => toggle(id)}
                  >
                    <span className="ability-choice__icon" aria-hidden>
                      <Icon />
                    </span>
                    <span className="ability-choice__copy">
                      <strong>{definition.label}</strong>
                      <span>{definition.promptDescription}</span>
                    </span>
                    <span className="ability-choice__check" aria-hidden>
                      {isSelected ? <Check /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {abilities.length ? (
          <section aria-labelledby="ability-manager-manage">
            <h3 id="ability-manager-manage" className="ability-manager__heading">
              On this project
            </h3>
            <ul className="ability-manager__list">
              {abilities.map((ability) => {
                const definition = PROJECT_ABILITIES[ability.id];
                const Icon = definition.icon;
                return (
                  <li
                    key={ability.id}
                    className={`ability-manager__row${ability.status === "paused" ? " ability-manager__row--paused" : ""}`}
                  >
                    <span className="ability-choice__icon" aria-hidden>
                      <Icon />
                    </span>
                    <span className="ability-manager__label">
                      <strong>{definition.label}</strong>
                      <span>{ability.status === "paused" ? "Paused" : "Active"}</span>
                    </span>
                    <button
                      type="button"
                      className="bd-btn-secondary"
                      onClick={() => togglePaused(ability)}
                      disabled={pending}
                    >
                      {ability.status === "paused" ? "Resume" : "Pause"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
