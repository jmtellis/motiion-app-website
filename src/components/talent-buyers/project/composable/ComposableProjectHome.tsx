"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { ArrowRight, Check, Plus, X } from "lucide-react";

import {
  dismissProjectAbilityPrompt,
  enableProjectAbilities,
  setProjectAbilityPaused,
} from "@/app/(buyer-app)/(paid)/projects/composable-actions";
import { useToast } from "@/components/talent-buyers/dashboard/ToastProvider";
import type { ProjectClassSeriesSummary } from "@/lib/talent-buyers/project-classes";
import {
  PROJECT_ABILITIES,
  PROJECT_ABILITY_ORDER,
  PROJECT_ABILITY_PRESETS,
  formatProjectDateRange,
  shouldShowWhatDoYouNeed,
  shouldShowZeroAbilityBanner,
  sortAbilityIds,
  type ProjectAbilityId,
  type ProjectAbilityState,
} from "@/lib/talent-buyers/project-abilities";
import {
  classSessionCreatePath,
  projectAbilityFirstStepPath,
  projectAbilityPath,
  projectPath,
  projectWorkspacePath,
} from "@/lib/talent-buyers/project-routes";

import { useProjectWorkspace, type ComposableWorkspaceMeta } from "../ProjectWorkspaceContext";
import { useComposableAbilityCounts } from "./ComposableProjectShell";
import { useComposableProjectUi } from "./ComposableProjectUiContext";
import { RosterStackTile } from "./RosterStackTile";
import { rosterStackTransitionName } from "./view-transition";

import "./composable-project.css";

function WhatDoYouNeed({
  projectId,
  suggest,
}: {
  projectId: string;
  suggest: ProjectAbilityId | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Set<ProjectAbilityId>>(
    () => new Set(suggest ? [suggest] : []),
  );
  const [pending, startTransition] = useTransition();

  function toggle(id: ProjectAbilityId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function dismiss() {
    startTransition(async () => {
      const result = await dismissProjectAbilityPrompt(projectId);
      if (!result.ok) showToast({ message: result.error, variant: "error" });
      router.refresh();
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
      router.refresh();
    });
  }

  return (
    <section className="need-prompt" aria-labelledby="need-prompt-title">
      <header className="need-prompt__header">
        <div>
          <h2 id="need-prompt-title">What do you need?</h2>
          <p>Pick one or more. You can add or pause tools anytime.</p>
        </div>
        <button
          type="button"
          className="need-prompt__dismiss"
          onClick={dismiss}
          disabled={pending}
          aria-label="Dismiss suggestions"
        >
          <X aria-hidden />
        </button>
      </header>

      <div className="need-prompt__cards">
        {PROJECT_ABILITY_ORDER.map((id) => {
          const definition = PROJECT_ABILITIES[id];
          const Icon = definition.icon;
          const isSelected = selected.has(id);
          return (
            <button
              key={id}
              type="button"
              className={`need-card${isSelected ? " need-card--selected" : ""}${
                suggest === id ? " need-card--suggested" : ""
              }`}
              aria-pressed={isSelected}
              onClick={() => toggle(id)}
              disabled={pending}
            >
              <span className="need-card__top">
                <span className="need-card__icon" aria-hidden>
                  <Icon />
                </span>
                <span className="need-card__check" aria-hidden>
                  {isSelected ? <Check /> : null}
                </span>
              </span>
              <strong>{definition.promptTitle}</strong>
              <span>{definition.promptDescription}</span>
              {suggest === id ? <em className="need-card__hint">Suggested</em> : null}
            </button>
          );
        })}
        <button type="button" className="need-card need-card--quiet" onClick={dismiss} disabled={pending}>
          <strong>Just organizing</strong>
          <span>Keep files and notes together for now. Add tools when you need them.</span>
        </button>
      </div>

      <div className="need-prompt__presets" role="group" aria-label="Not sure? Start from an example">
        <span>Not sure?</span>
        {PROJECT_ABILITY_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="need-chip"
            onClick={() => setSelected(new Set(preset.abilities))}
            disabled={pending}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <footer className="need-prompt__footer">
        <button type="button" className="need-prompt__skip" onClick={dismiss} disabled={pending}>
          Skip for now — add tools anytime
        </button>
        <button
          type="button"
          className="buyer-chrome-bar__cta"
          onClick={addSelected}
          disabled={pending || selected.size === 0}
        >
          {pending
            ? "Adding…"
            : selected.size === 0
              ? "Choose what you need"
              : `Add ${sortAbilityIds(selected)
                  .map((id) => PROJECT_ABILITIES[id].label)
                  .join(" + ")}`}
        </button>
      </footer>
    </section>
  );
}

function AbilitySection({
  ability,
  projectId,
  children,
  action,
}: {
  ability: ProjectAbilityState;
  projectId: string;
  children: ReactNode;
  action: { label: string; href: string };
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const definition = PROJECT_ABILITIES[ability.id];
  const Icon = definition.icon;
  const paused = ability.status === "paused";

  function resume() {
    startTransition(async () => {
      const result = await setProjectAbilityPaused({ projectId, ability: ability.id, paused: false });
      if (!result.ok) showToast({ message: result.error, variant: "error" });
      router.refresh();
    });
  }

  return (
    <section
      className={`ability-section${paused ? " ability-section--paused" : ""}`}
      aria-labelledby={`ability-${ability.id}`}
    >
      <header className="ability-section__header">
        <span className="ability-section__icon" aria-hidden>
          <Icon />
        </span>
        <h3 id={`ability-${ability.id}`}>{definition.label}</h3>
        {paused ? <span className="ability-section__state">Paused</span> : null}
        <Link href={projectAbilityPath(projectId, ability.id)} className="ability-section__open">
          Open <ArrowRight aria-hidden />
        </Link>
      </header>
      <div className="ability-section__body">{children}</div>
      <footer className="ability-section__footer">
        {paused ? (
          <button type="button" className="bd-btn-secondary" onClick={resume} disabled={pending}>
            Resume {definition.label.toLowerCase()}
          </button>
        ) : (
          <Link href={action.href} className="bd-btn-secondary">
            {action.label}
          </Link>
        )}
      </footer>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="ability-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function castingStatusLabel(status: string | null | undefined) {
  if (status === "published" || status === "open") return "Open";
  if (status === "paused") return "Paused";
  if (status === "closed") return "Closed";
  return "Draft";
}

function formatSessionWhen(date: string | null, time: string | null) {
  if (!date) return "Date TBD";
  const day = formatProjectDateRange(date, null) ?? date;
  if (!time) return day;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours)) return day;
  const clock = new Date(2000, 0, 1, hours, minutes || 0).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${clock}`;
}

export function ComposableProjectHome({
  classSeries,
  suggest,
}: {
  classSeries: ProjectClassSeriesSummary | null;
  suggest: ProjectAbilityId | null;
}) {
  const { projectId, project, castings, castingWorkflow, rosterMembers } = useProjectWorkspace();
  const { openAbilityManager, openShellEditor } = useComposableProjectUi();
  const counts = useComposableAbilityCounts();
  const composable = project.composable as ComposableWorkspaceMeta;
  const { abilities } = composable;

  const showPrompt = shouldShowWhatDoYouNeed({
    abilities,
    promptDismissedAt: composable.promptDismissedAt,
  });
  const showBanner = shouldShowZeroAbilityBanner({
    abilities,
    promptDismissedAt: composable.promptDismissedAt,
    createdAt: composable.createdAt,
  });
  const dates = formatProjectDateRange(composable.startDate, composable.endDate);
  const primaryCasting = castingWorkflow?.primaryCasting ?? null;
  const castingStatus = primaryCasting?.status ?? castings[0]?.status ?? null;
  const applicantCount = castingWorkflow ? castingWorkflow.candidates.length : null;

  return (
    <div className="project-home">
      <div className="project-home__main">
        {showPrompt ? <WhatDoYouNeed projectId={projectId} suggest={suggest} /> : null}

        {!showPrompt && abilities.length === 0 ? (
          <section className={`project-home__empty${showBanner ? " project-home__empty--banner" : ""}`}>
            <div>
              <h2>{showBanner ? "Ready to put this project to work?" : "No abilities yet"}</h2>
              <p>Add casting, a roster, or classes when you need them. Nothing is published until you do.</p>
            </div>
            <button type="button" className="buyer-chrome-bar__cta" onClick={() => openAbilityManager()}>
              <Plus aria-hidden /> Ability
            </button>
          </section>
        ) : null}

        {abilities.length ? (
          <div className="project-home__sections">
            {abilities.map((ability) => {
              if (ability.id === "casting") {
                return (
                  <AbilitySection
                    key={ability.id}
                    ability={ability}
                    projectId={projectId}
                    action={
                      counts.castingRoleCount === 0
                        ? { label: "Add first role", href: projectAbilityFirstStepPath(projectId, "casting") }
                        : { label: "Review applicants", href: projectWorkspacePath(projectId, "review") }
                    }
                  >
                    <dl className="ability-stats">
                      <Stat label="Status" value={castingStatusLabel(castingStatus)} />
                      <Stat label="Roles" value={counts.castingRoleCount} />
                      <Stat label="Applicants" value={applicantCount ?? "—"} />
                    </dl>
                    <p className="ability-section__note">
                      {castingStatus === "published" || castingStatus === "open"
                        ? "Your open call is live for talent."
                        : "Private until you publish the casting."}
                    </p>
                  </AbilitySection>
                );
              }

              if (ability.id === "roster") {
                return (
                  <AbilitySection
                    key={ability.id}
                    ability={ability}
                    projectId={projectId}
                    action={{ label: "Invite dancers", href: projectAbilityFirstStepPath(projectId, "roster") }}
                  >
                    <RosterStackTile
                      people={rosterMembers.map((member) => ({
                        id: member.id,
                        name: member.name,
                        avatarUrl: member.avatarUrl,
                      }))}
                      label="Roster"
                      sublabel={
                        rosterMembers.length
                          ? `${rosterMembers.length} ${rosterMembers.length === 1 ? "dancer" : "dancers"}`
                          : "No dancers yet"
                      }
                      href={projectPath(projectId, "roster")}
                      transitionName={rosterStackTransitionName(projectId)}
                    />
                  </AbilitySection>
                );
              }

              const next = classSeries?.nextSession ?? null;
              return (
                <AbilitySection
                  key={ability.id}
                  ability={ability}
                  projectId={projectId}
                  action={{ label: "Add session", href: classSessionCreatePath(projectId) }}
                >
                  <dl className="ability-stats">
                    <Stat label="Sessions" value={classSeries?.sessionCount ?? counts.classSessionCount} />
                    <Stat
                      label="Enrolled"
                      value={
                        classSeries
                          ? classSeries.capacityTotal
                            ? `${classSeries.enrolledTotal}/${classSeries.capacityTotal}`
                            : classSeries.enrolledTotal
                          : "—"
                      }
                    />
                    <Stat
                      label="Attendance"
                      value={
                        classSeries?.attendanceRate != null
                          ? `${Math.round(classSeries.attendanceRate * 100)}%`
                          : "—"
                      }
                    />
                  </dl>
                  <p className="ability-section__note">
                    {next
                      ? `Next: ${next.title} · ${formatSessionWhen(next.activityDate, next.startTime)}`
                      : "No upcoming sessions."}
                  </p>
                </AbilitySection>
              );
            })}
          </div>
        ) : null}
      </div>

      <aside className="project-home__aside" aria-label="Project details">
        <section className="project-home__details">
          <header>
            <h3>Details</h3>
            <button type="button" className="ability-section__open" onClick={openShellEditor}>
              Edit
            </button>
          </header>
          <dl>
            <div>
              <dt>City</dt>
              <dd>{project.location?.trim() || "—"}</dd>
            </div>
            <div>
              <dt>Dates</dt>
              <dd>{dates ?? "—"}</dd>
            </div>
            <div>
              <dt>Visibility</dt>
              <dd>Private · abilities publish on their own</dd>
            </div>
            <div>
              <dt>People</dt>
              <dd>
                {rosterMembers.length} on roster
                {applicantCount != null ? ` · ${applicantCount} applicants` : ""}
              </dd>
            </div>
          </dl>
        </section>
        {abilities.length > 0 && abilities.length < PROJECT_ABILITY_ORDER.length ? (
          <button type="button" className="project-home__add" onClick={() => openAbilityManager()}>
            <Plus aria-hidden /> Add an ability
          </button>
        ) : null}
      </aside>
    </div>
  );
}
