"use client";

import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  createActivityFromDraft,
  updateActivityFromDraft,
} from "@/app/(buyer-app)/events/actions";
import {
  fetchConnectAccountStatus,
  startStripeConnectOnboarding,
} from "@/app/(buyer-app)/calendar/connect-actions";
import { AuthButton } from "@/components/auth/ui";
import { SetupFlowFormPanel } from "@/components/auth/SetupFlowFormPanel";
import {
  ActivityField,
  ActivityLocationField,
  ActivityTextArea,
  ActivityTextInput,
  PillSelect,
  StringListEditor,
} from "@/components/talent-buyers/activities/activity-composer-fields";
import {
  createDefaultEventDay,
  createDefaultTicketOptions,
} from "@/lib/talent-buyers/activities/defaults";
import {
  ACTIVITY_CREATE_REGISTRY,
  CLASS_FOCUSES,
  CLASS_INTENSITIES,
  CLASS_SKILL_LEVELS,
  EVENT_TYPES,
  SESSION_VIBES,
  stepLabel,
  type ActivityComposerStepId,
} from "@/lib/talent-buyers/activities/registry";
import type {
  ActivityDraft,
  ActivityType,
  ConnectAccountStatus,
  TicketAccessMode,
} from "@/lib/talent-buyers/activities/types";
import { validateActivityDraft } from "@/lib/talent-buyers/activities/validate-draft";

import "@/components/talent-buyers/project/casting-create-wizard.css";
import "@/components/talent-buyers/project/project-create.css";

type Props = {
  initialDraft: ActivityDraft;
  mode?: "create" | "edit";
  activityId?: string;
  initialConnectStatus?: ConnectAccountStatus | null;
  closeHref?: string;
};

export function ActivityCreateWizard({
  initialDraft,
  mode = "create",
  activityId,
  initialConnectStatus = null,
  closeHref = "/calendar",
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState(initialConnectStatus);
  const [isPending, startTransition] = useTransition();

  const config = ACTIVITY_CREATE_REGISTRY[draft.type];
  const steps = config.steps;
  const currentStep = steps[stepIndex] ?? "type";
  const isLast = stepIndex >= steps.length - 1;
  const isFirst = stepIndex === 0;

  const connectReady = connectStatus?.isReadyToAcceptPayments === true;

  const progress = useMemo(
    () => ({
      current: stepIndex + 1,
      total: steps.length,
      percent: Math.round(((stepIndex + 1) / steps.length) * 100),
    }),
    [stepIndex, steps.length],
  );

  function setType(type: ActivityType) {
    setDraft((prev) => {
      const next = { ...prev, type };
      if (type === "session") {
        next.isPaid = false;
        if (!next.maxAttendees) next.maxAttendees = 20;
      }
      if (type === "event" && next.eventDays.length === 0) {
        next.eventDays = [createDefaultEventDay()];
      }
      if (type === "event" && next.ticketOptions.length === 0) {
        next.ticketOptions = createDefaultTicketOptions();
      }
      return next;
    });
    setStepIndex(0);
  }

  function goNext() {
    setError(null);
    if (isLast) {
      publish();
      return;
    }
    setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  }

  function goBack() {
    setError(null);
    setStepIndex((value) => Math.max(0, value - 1));
  }

  function publish() {
    const validation = validateActivityDraft(draft);
    if (validation) {
      setError(validation);
      return;
    }
    if (draft.isPaid && draft.type !== "session" && !connectReady) {
      setError("Finish Stripe payment setup before publishing a paid activity.");
      return;
    }

    startTransition(async () => {
      const result =
        mode === "edit" && activityId
          ? await updateActivityFromDraft(activityId, draft)
          : await createActivityFromDraft(draft);
      if (!result.ok || !result.id) {
        setError(result.error ?? "Could not save the activity.");
        return;
      }
      router.push(`/calendar/${result.id}`);
      router.refresh();
    });
  }

  async function ensureConnectStatus() {
    const result = await fetchConnectAccountStatus();
    if (result.ok && result.status) setConnectStatus(result.status);
    return result.status;
  }

  function startConnect() {
    startTransition(async () => {
      const result = await startStripeConnectOnboarding();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      setError(result.error ?? "Could not start Stripe onboarding.");
      await ensureConnectStatus();
    });
  }

  return (
    <div className="casting-create-wizard activity-create-wizard">
      <aside className="casting-create-wizard__context">
        <div className="casting-create-wizard__context-body">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
            {mode === "edit" ? "Edit" : "Create"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{config.pageTitle}</h2>
          <p className="mt-2 text-sm text-white/55">{config.lede}</p>
          <ol className="mt-8 space-y-2">
            {steps.map((step, index) => (
              <li key={step}>
                <button
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    index === stepIndex
                      ? "bg-[#2dd4bf]/12 text-[#2dd4bf]"
                      : "text-white/55 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {index + 1}. {stepLabel(step)}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      <div
        className="casting-create-wizard__form casting-create-wizard__form--with-progress"
        style={{ ["--casting-progress" as string]: `${progress.percent}%` }}
      >
        <div className="casting-create-wizard__form-top">
          <Link href={closeHref} className="casting-create-wizard__close">
            Close
            <X className="size-4" aria-hidden />
          </Link>
        </div>

        <SetupFlowFormPanel
          title={stepLabel(currentStep)}
          subtitle={
            currentStep === "type"
              ? "Choose class, session, or event."
              : `Step ${progress.current} of ${progress.total}`
          }
          progressLabel={config.pageTitle}
          progressPercent={progress.percent}
          progressCurrent={progress.current}
          progressTotal={progress.total}
          showProgressMeta={false}
          error={error}
          footer={
            <div className="casting-create-wizard__footer">
              <div className="casting-create-wizard__footer-start">
                {!isFirst ? (
                  <AuthButton type="button" variant="secondary" onClick={goBack} disabled={isPending}>
                    <ChevronLeft className="size-4" />
                    Back
                  </AuthButton>
                ) : null}
              </div>
              <div className="casting-create-wizard__footer-end">
                <AuthButton type="button" onClick={goNext} disabled={isPending}>
                  {isPending ? "Saving…" : isLast ? config.publishLabel : "Continue"}
                  {!isLast ? <ChevronRight className="size-4" /> : null}
                </AuthButton>
              </div>
            </div>
          }
        >
          {currentStep === "type" ? (
            <TypeStep draft={draft} onSelect={setType} />
          ) : null}
          {currentStep === "basics" || currentStep === "details" ? (
            <BasicsStep draft={draft} onChange={setDraft} />
          ) : null}
          {currentStep === "learning" ? <LearningStep draft={draft} onChange={setDraft} /> : null}
          {currentStep === "dates" ? <DatesStep draft={draft} onChange={setDraft} /> : null}
          {currentStep === "tickets" ? (
            <TicketsStep
              draft={draft}
              onChange={setDraft}
              connectReady={connectReady}
              onStartConnect={startConnect}
            />
          ) : null}
          {currentStep === "experience" ? (
            <ExperienceStep draft={draft} onChange={setDraft} />
          ) : null}
          {currentStep === "attendees" ? <AttendeesStep draft={draft} onChange={setDraft} /> : null}
          {currentStep === "extras" ? <ExtrasStep draft={draft} onChange={setDraft} /> : null}
          {currentStep === "settings" || currentStep === "publish" ? (
            <SettingsPublishStep
              draft={draft}
              onChange={setDraft}
              connectReady={connectReady}
              onStartConnect={startConnect}
              step={currentStep}
            />
          ) : null}
        </SetupFlowFormPanel>
      </div>
    </div>
  );
}

function TypeStep({
  draft,
  onSelect,
}: {
  draft: ActivityDraft;
  onSelect: (type: ActivityType) => void;
}) {
  const options: { type: ActivityType; title: string; body: string }[] = [
    {
      type: "event",
      title: "Event",
      body: "Showcases, mixers, and ticketed multi-day experiences.",
    },
    {
      type: "class",
      title: "Class",
      body: "Scheduled training with capacity, learning goals, and optional payment.",
    },
    {
      type: "session",
      title: "Session",
      body: "Free open floors, jams, and community practice.",
    },
  ];

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const selected = draft.type === option.type;
        return (
          <button
            key={option.type}
            type="button"
            onClick={() => onSelect(option.type)}
            className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
              selected
                ? "border-[#2dd4bf]/45 bg-[#2dd4bf]/10"
                : "border-white/12 bg-black/20 hover:border-white/25"
            }`}
          >
            <p className="text-base font-semibold text-white">{option.title}</p>
            <p className="mt-1 text-sm text-white/55">{option.body}</p>
          </button>
        );
      })}
    </div>
  );
}

function BasicsStep({
  draft,
  onChange,
}: {
  draft: ActivityDraft;
  onChange: (draft: ActivityDraft) => void;
}) {
  return (
    <div className="space-y-4">
      <ActivityField label="Title">
        <ActivityTextInput
          value={draft.title}
          placeholder={ACTIVITY_CREATE_REGISTRY[draft.type].titlePlaceholder}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
        />
      </ActivityField>
      <ActivityField label="Description">
        <ActivityTextArea
          value={draft.description}
          placeholder={ACTIVITY_CREATE_REGISTRY[draft.type].descriptionPlaceholder}
          onChange={(event) => onChange({ ...draft, description: event.target.value })}
        />
      </ActivityField>
      <ActivityLocationField draft={draft} onChange={onChange} />
      {draft.type === "event" ? (
        <PillSelect
          label="Event type"
          options={EVENT_TYPES}
          value={draft.subcategory}
          onChange={(value) => onChange({ ...draft, subcategory: value })}
        />
      ) : null}
      {draft.type !== "event" ? (
        <div className="grid grid-cols-2 gap-3">
          <ActivityField label="Date">
            <ActivityTextInput
              type="date"
              value={draft.activityDate}
              onChange={(event) =>
                onChange({
                  ...draft,
                  activityDate: event.target.value,
                  endDate: event.target.value,
                })
              }
            />
          </ActivityField>
          <ActivityField label="Start time">
            <ActivityTextInput
              type="time"
              value={draft.startTime}
              onChange={(event) => onChange({ ...draft, startTime: event.target.value })}
            />
          </ActivityField>
          <ActivityField label="End time">
            <ActivityTextInput
              type="time"
              value={draft.endTime}
              onChange={(event) => onChange({ ...draft, endTime: event.target.value })}
            />
          </ActivityField>
          <ActivityField label="Capacity">
            <ActivityTextInput
              type="number"
              min={1}
              value={draft.maxAttendees ?? ""}
              onChange={(event) =>
                onChange({
                  ...draft,
                  maxAttendees: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </ActivityField>
        </div>
      ) : null}
    </div>
  );
}

function LearningStep({
  draft,
  onChange,
}: {
  draft: ActivityDraft;
  onChange: (draft: ActivityDraft) => void;
}) {
  return (
    <div className="space-y-4">
      <StringListEditor
        label="What you'll learn"
        values={draft.whatYouWillLearn}
        placeholder="e.g. Clean isolations"
        onChange={(whatYouWillLearn) => onChange({ ...draft, whatYouWillLearn })}
      />
      <PillSelect
        label="Skill level"
        options={CLASS_SKILL_LEVELS}
        value={draft.skillLevel}
        onChange={(skillLevel) => onChange({ ...draft, skillLevel })}
      />
      <PillSelect
        label="Focus"
        options={CLASS_FOCUSES}
        value={draft.classFocus}
        onChange={(classFocus) => onChange({ ...draft, classFocus })}
      />
      <ActivityField label="Prerequisites">
        <ActivityTextArea
          value={draft.prerequisites}
          placeholder="Any prior training required?"
          onChange={(event) => onChange({ ...draft, prerequisites: event.target.value })}
        />
      </ActivityField>
    </div>
  );
}

function DatesStep({
  draft,
  onChange,
}: {
  draft: ActivityDraft;
  onChange: (draft: ActivityDraft) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-white/55">
        Add one or more days. Ticket access can cover all days, a fixed set, or a selectable range.
      </p>
      {draft.eventDays.map((day, index) => (
        <div key={day.id} className="space-y-3 rounded-2xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Day {index + 1}</p>
            {draft.eventDays.length > 1 ? (
              <button
                type="button"
                className="text-white/50 hover:text-white"
                onClick={() =>
                  onChange({
                    ...draft,
                    eventDays: draft.eventDays.filter((item) => item.id !== day.id),
                  })
                }
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ActivityField label="Date">
              <ActivityTextInput
                type="date"
                value={day.dayDate}
                onChange={(event) => {
                  const eventDays = [...draft.eventDays];
                  eventDays[index] = { ...day, dayDate: event.target.value };
                  onChange({ ...draft, eventDays });
                }}
              />
            </ActivityField>
            <ActivityField label="Label (optional)">
              <ActivityTextInput
                value={day.label}
                placeholder="Night 1"
                onChange={(event) => {
                  const eventDays = [...draft.eventDays];
                  eventDays[index] = { ...day, label: event.target.value };
                  onChange({ ...draft, eventDays });
                }}
              />
            </ActivityField>
            <ActivityField label="Start">
              <ActivityTextInput
                type="time"
                value={day.startTime}
                onChange={(event) => {
                  const eventDays = [...draft.eventDays];
                  eventDays[index] = { ...day, startTime: event.target.value };
                  onChange({ ...draft, eventDays });
                }}
              />
            </ActivityField>
            <ActivityField label="End">
              <ActivityTextInput
                type="time"
                value={day.endTime}
                onChange={(event) => {
                  const eventDays = [...draft.eventDays];
                  eventDays[index] = { ...day, endTime: event.target.value };
                  onChange({ ...draft, eventDays });
                }}
              />
            </ActivityField>
            <ActivityField label="Day capacity">
              <ActivityTextInput
                type="number"
                min={1}
                value={day.maxAttendees ?? ""}
                onChange={(event) => {
                  const eventDays = [...draft.eventDays];
                  eventDays[index] = {
                    ...day,
                    maxAttendees: event.target.value ? Number(event.target.value) : null,
                  };
                  onChange({ ...draft, eventDays });
                }}
              />
            </ActivityField>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="bd-btn-secondary gap-1.5"
        onClick={() =>
          onChange({
            ...draft,
            eventDays: [...draft.eventDays, createDefaultEventDay()],
          })
        }
      >
        <Plus className="size-4" />
        Add day
      </button>
      <ActivityField label="Overall event capacity (optional)">
        <ActivityTextInput
          type="number"
          min={1}
          value={draft.maxAttendees ?? ""}
          onChange={(event) =>
            onChange({
              ...draft,
              maxAttendees: event.target.value ? Number(event.target.value) : null,
            })
          }
        />
      </ActivityField>
    </div>
  );
}

function TicketsStep({
  draft,
  onChange,
  connectReady,
  onStartConnect,
}: {
  draft: ActivityDraft;
  onChange: (draft: ActivityDraft) => void;
  connectReady: boolean;
  onStartConnect: () => void;
}) {
  const accessModes: { id: TicketAccessMode; label: string }[] = [
    { id: "all_days", label: "All days" },
    { id: "select_days", label: "Guest picks days" },
    { id: "fixed_days", label: "Fixed days" },
  ];

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Accept payments</p>
          <p className="text-xs text-white/50">Sell tickets through Stripe Connect</p>
        </div>
        <input
          type="checkbox"
          checked={draft.isPaid}
          onChange={(event) => onChange({ ...draft, isPaid: event.target.checked })}
          className="size-4 accent-[#2dd4bf]"
        />
      </label>

      {draft.isPaid && !connectReady ? (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3">
          <p className="text-sm text-amber-100">
            Stripe Connect is required before you can publish paid tickets.
          </p>
          <button type="button" className="bd-btn-accent mt-3" onClick={onStartConnect}>
            Set up payouts
          </button>
        </div>
      ) : null}

      {draft.isPaid
        ? draft.ticketOptions.map((ticket, index) => (
            <div key={ticket.id} className="space-y-3 rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Ticket {index + 1}</p>
                {draft.ticketOptions.length > 1 ? (
                  <button
                    type="button"
                    className="text-white/50 hover:text-white"
                    onClick={() =>
                      onChange({
                        ...draft,
                        ticketOptions: draft.ticketOptions.filter((item) => item.id !== ticket.id),
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ActivityField label="Name">
                  <ActivityTextInput
                    value={ticket.label}
                    onChange={(event) => {
                      const ticketOptions = [...draft.ticketOptions];
                      ticketOptions[index] = { ...ticket, label: event.target.value };
                      onChange({ ...draft, ticketOptions });
                    }}
                  />
                </ActivityField>
                <ActivityField label="Price (USD)">
                  <ActivityTextInput
                    type="number"
                    min={0.5}
                    step="0.01"
                    value={ticket.priceAmount}
                    onChange={(event) => {
                      const ticketOptions = [...draft.ticketOptions];
                      ticketOptions[index] = {
                        ...ticket,
                        priceAmount: Number(event.target.value) || 0,
                      };
                      onChange({ ...draft, ticketOptions });
                    }}
                  />
                </ActivityField>
                <ActivityField label="Max sales">
                  <ActivityTextInput
                    type="number"
                    min={1}
                    value={ticket.maxSales ?? ""}
                    onChange={(event) => {
                      const ticketOptions = [...draft.ticketOptions];
                      ticketOptions[index] = {
                        ...ticket,
                        maxSales: event.target.value ? Number(event.target.value) : null,
                      };
                      onChange({ ...draft, ticketOptions });
                    }}
                  />
                </ActivityField>
              </div>
              <ActivityField label="Access">
                <div className="flex flex-wrap gap-2">
                  {accessModes.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        const ticketOptions = [...draft.ticketOptions];
                        ticketOptions[index] = { ...ticket, accessMode: mode.id };
                        onChange({ ...draft, ticketOptions });
                      }}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        ticket.accessMode === mode.id
                          ? "border-[#2dd4bf]/45 bg-[#2dd4bf]/12 text-[#2dd4bf]"
                          : "border-white/12 text-white/60"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </ActivityField>
              {ticket.accessMode === "select_days" ? (
                <div className="grid grid-cols-2 gap-3">
                  <ActivityField label="Min days">
                    <ActivityTextInput
                      type="number"
                      min={1}
                      value={ticket.minDays ?? 1}
                      onChange={(event) => {
                        const ticketOptions = [...draft.ticketOptions];
                        ticketOptions[index] = {
                          ...ticket,
                          minDays: Number(event.target.value) || 1,
                        };
                        onChange({ ...draft, ticketOptions });
                      }}
                    />
                  </ActivityField>
                  <ActivityField label="Max days">
                    <ActivityTextInput
                      type="number"
                      min={1}
                      value={ticket.maxDays ?? ticket.minDays ?? 1}
                      onChange={(event) => {
                        const ticketOptions = [...draft.ticketOptions];
                        ticketOptions[index] = {
                          ...ticket,
                          maxDays: Number(event.target.value) || 1,
                        };
                        onChange({ ...draft, ticketOptions });
                      }}
                    />
                  </ActivityField>
                </div>
              ) : null}
              {ticket.accessMode === "fixed_days" ? (
                <ActivityField label="Included days">
                  <div className="space-y-2">
                    {draft.eventDays.map((day) => {
                      const checked = ticket.includedEventDayIds.includes(day.id);
                      return (
                        <label key={day.id} className="flex items-center gap-2 text-sm text-white/75">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const included = checked
                                ? ticket.includedEventDayIds.filter((id) => id !== day.id)
                                : [...ticket.includedEventDayIds, day.id];
                              const ticketOptions = [...draft.ticketOptions];
                              ticketOptions[index] = {
                                ...ticket,
                                includedEventDayIds: included,
                              };
                              onChange({ ...draft, ticketOptions });
                            }}
                            className="accent-[#2dd4bf]"
                          />
                          {day.label || day.dayDate}
                        </label>
                      );
                    })}
                  </div>
                </ActivityField>
              ) : null}
            </div>
          ))
        : null}

      {draft.isPaid ? (
        <button
          type="button"
          className="bd-btn-secondary gap-1.5"
          onClick={() =>
            onChange({
              ...draft,
              ticketOptions: [
                ...draft.ticketOptions,
                {
                  id: crypto.randomUUID(),
                  label: "New ticket",
                  priceAmount: 25,
                  accessMode: "all_days",
                  minDays: null,
                  maxDays: null,
                  maxSales: null,
                  includedEventDayIds: [],
                },
              ],
            })
          }
        >
          <Plus className="size-4" />
          Add ticket type
        </button>
      ) : null}
    </div>
  );
}

function ExperienceStep({
  draft,
  onChange,
}: {
  draft: ActivityDraft;
  onChange: (draft: ActivityDraft) => void;
}) {
  if (draft.type === "session") {
    return (
      <div className="space-y-4">
        <ActivityField label="Session type">
          <ActivityTextInput
            value={draft.sessionType}
            placeholder="Open floor, freestyle, etc."
            onChange={(event) => onChange({ ...draft, sessionType: event.target.value })}
          />
        </ActivityField>
        <ActivityField label="Level">
          <ActivityTextInput
            value={draft.sessionLevel}
            placeholder="All levels"
            onChange={(event) => onChange({ ...draft, sessionLevel: event.target.value })}
          />
        </ActivityField>
        <PillSelect
          label="Vibe"
          options={SESSION_VIBES}
          value={draft.sessionVibe}
          onChange={(sessionVibe) => onChange({ ...draft, sessionVibe })}
        />
        <ActivityField label="Genre">
          <ActivityTextInput
            value={draft.sessionGenre}
            placeholder="Hip-hop, contemporary…"
            onChange={(event) => onChange({ ...draft, sessionGenre: event.target.value })}
          />
        </ActivityField>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StringListEditor
        label="Highlights"
        values={draft.eventHighlights}
        placeholder="Live DJ, industry judges…"
        onChange={(eventHighlights) => onChange({ ...draft, eventHighlights })}
      />
      <StringListEditor
        label="Lineup"
        values={draft.eventLineup}
        placeholder="Artist or guest name"
        max={20}
        onChange={(eventLineup) => onChange({ ...draft, eventLineup })}
      />
      <ActivityField label="Run of show">
        <div className="space-y-2">
          {draft.eventScheduleItems.map((item, index) => (
            <div key={item.id} className="grid grid-cols-[100px_1fr_auto] gap-2">
              <ActivityTextInput
                value={item.timeLabel}
                placeholder="7:00"
                onChange={(event) => {
                  const eventScheduleItems = [...draft.eventScheduleItems];
                  eventScheduleItems[index] = { ...item, timeLabel: event.target.value };
                  onChange({ ...draft, eventScheduleItems });
                }}
              />
              <ActivityTextInput
                value={item.title}
                placeholder="Doors open"
                onChange={(event) => {
                  const eventScheduleItems = [...draft.eventScheduleItems];
                  eventScheduleItems[index] = { ...item, title: event.target.value };
                  onChange({ ...draft, eventScheduleItems });
                }}
              />
              <button
                type="button"
                className="bd-btn-secondary"
                onClick={() =>
                  onChange({
                    ...draft,
                    eventScheduleItems: draft.eventScheduleItems.filter((_, i) => i !== index),
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="bd-btn-secondary"
            onClick={() =>
              onChange({
                ...draft,
                eventScheduleItems: [
                  ...draft.eventScheduleItems,
                  { id: crypto.randomUUID(), timeLabel: "", title: "", detail: "" },
                ],
              })
            }
          >
            Add schedule item
          </button>
        </div>
      </ActivityField>
    </div>
  );
}

function AttendeesStep({
  draft,
  onChange,
}: {
  draft: ActivityDraft;
  onChange: (draft: ActivityDraft) => void;
}) {
  return (
    <div className="space-y-4">
      <ActivityField label="Dress code">
        <ActivityTextArea
          value={draft.eventDressCode}
          onChange={(event) => onChange({ ...draft, eventDressCode: event.target.value })}
        />
      </ActivityField>
      <ActivityField label="Arrival notes">
        <ActivityTextArea
          value={draft.eventArrivalNotes}
          onChange={(event) => onChange({ ...draft, eventArrivalNotes: event.target.value })}
        />
      </ActivityField>
      <ActivityField label="Food & drinks">
        <ActivityTextArea
          value={draft.eventFoodDrinksInfo}
          onChange={(event) => onChange({ ...draft, eventFoodDrinksInfo: event.target.value })}
        />
      </ActivityField>
      <ActivityField label="Accessibility">
        <ActivityTextArea
          value={draft.eventAccessibilityInfo}
          onChange={(event) => onChange({ ...draft, eventAccessibilityInfo: event.target.value })}
        />
      </ActivityField>
      <ActivityField label="Late entry">
        <ActivityTextArea
          value={draft.eventLateEntryPolicy}
          onChange={(event) => onChange({ ...draft, eventLateEntryPolicy: event.target.value })}
        />
      </ActivityField>
      <ActivityField label="Cancellation">
        <ActivityTextArea
          value={draft.eventCancellationPolicy}
          onChange={(event) => onChange({ ...draft, eventCancellationPolicy: event.target.value })}
        />
      </ActivityField>
    </div>
  );
}

function ExtrasStep({
  draft,
  onChange,
}: {
  draft: ActivityDraft;
  onChange: (draft: ActivityDraft) => void;
}) {
  return (
    <div className="space-y-4">
      {draft.type === "class" ? (
        <PillSelect
          label="Intensity"
          options={CLASS_INTENSITIES}
          value={draft.intensity}
          onChange={(intensity) => onChange({ ...draft, intensity })}
        />
      ) : null}
      <ActivityField label="Dress code">
        <ActivityTextArea
          value={draft.dressCode}
          onChange={(event) => onChange({ ...draft, dressCode: event.target.value })}
        />
      </ActivityField>
      <ActivityField label="What to bring">
        <ActivityTextArea
          value={draft.whatToBring}
          onChange={(event) => onChange({ ...draft, whatToBring: event.target.value })}
        />
      </ActivityField>
      <ActivityField label="Cancellation policy">
        <ActivityTextArea
          value={draft.cancellationPolicy}
          onChange={(event) => onChange({ ...draft, cancellationPolicy: event.target.value })}
        />
      </ActivityField>
      {draft.type === "session" ? (
        <>
          <ActivityField label="Rules">
            <ActivityTextArea
              value={draft.sessionRules}
              onChange={(event) => onChange({ ...draft, sessionRules: event.target.value })}
            />
          </ActivityField>
          <ActivityField label="Good to know">
            <ActivityTextArea
              value={draft.sessionGoodToKnow}
              onChange={(event) => onChange({ ...draft, sessionGoodToKnow: event.target.value })}
            />
          </ActivityField>
        </>
      ) : null}
    </div>
  );
}

function SettingsPublishStep({
  draft,
  onChange,
  connectReady,
  onStartConnect,
  step,
}: {
  draft: ActivityDraft;
  onChange: (draft: ActivityDraft) => void;
  connectReady: boolean;
  onStartConnect: () => void;
  step: ActivityComposerStepId;
}) {
  return (
    <div className="space-y-4">
      {draft.type === "class" ? (
        <>
          <label className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Paid class</p>
              <p className="text-xs text-white/50">Charge a single price via Stripe</p>
            </div>
            <input
              type="checkbox"
              checked={draft.isPaid}
              onChange={(event) => onChange({ ...draft, isPaid: event.target.checked })}
              className="size-4 accent-[#2dd4bf]"
            />
          </label>
          {draft.isPaid ? (
            <ActivityField label="Price (USD)">
              <ActivityTextInput
                type="number"
                min={0.5}
                step="0.01"
                value={draft.priceAmount}
                onChange={(event) =>
                  onChange({ ...draft, priceAmount: Number(event.target.value) || 0 })
                }
              />
            </ActivityField>
          ) : null}
          {draft.isPaid && !connectReady ? (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3">
              <p className="text-sm text-amber-100">Stripe Connect is required for paid classes.</p>
              <button type="button" className="bd-btn-accent mt-3" onClick={onStartConnect}>
                Set up payouts
              </button>
            </div>
          ) : null}
          <ActivityField label="Guest spots">
            <ActivityTextInput
              type="number"
              min={0}
              value={draft.maxGuestSpots ?? ""}
              onChange={(event) =>
                onChange({
                  ...draft,
                  maxGuestSpots: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </ActivityField>
        </>
      ) : null}

      <label className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Public listing</p>
          <p className="text-xs text-white/50">Discoverable on Motiion when public</p>
        </div>
        <input
          type="checkbox"
          checked={draft.isPublic}
          onChange={(event) => onChange({ ...draft, isPublic: event.target.checked })}
          className="size-4 accent-[#2dd4bf]"
        />
      </label>

      {draft.type !== "event" || step === "publish" ? (
        <ActivityField label="Co-organizer user IDs (optional, up to 5)">
          <ActivityTextArea
            value={draft.collaboratorUserIds.join("\n")}
            placeholder="Paste Motiion user UUIDs, one per line"
            onChange={(event) =>
              onChange({
                ...draft,
                collaboratorUserIds: event.target.value
                  .split(/\n|,/)
                  .map((value) => value.trim())
                  .filter(Boolean)
                  .slice(0, 5),
              })
            }
          />
        </ActivityField>
      ) : null}

      {step === "publish" ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/65">
          <p className="font-semibold text-white">Ready to publish</p>
          <p className="mt-1">
            {draft.title.trim() || "Untitled"} · {draft.type}
            {draft.isPaid ? " · Paid" : " · Free"} · {draft.isPublic ? "Public" : "Private"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
