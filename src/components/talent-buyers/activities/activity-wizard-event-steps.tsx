"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";

import { uploadActivityCover } from "@/app/(buyer-app)/(paid)/calendar/activity-media-actions";
import { ActivityPeoplePicker } from "@/components/talent-buyers/activities/ActivityPeoplePicker";
import {
  ActivityField,
  ActivityTextInput,
} from "@/components/talent-buyers/activities/activity-composer-fields";
import {
  createDefaultJobGroup,
  createDefaultPromoCode,
  createLocalId,
} from "@/lib/talent-buyers/activities/defaults";
import type { ActivityDraft } from "@/lib/talent-buyers/activities/types";

export function ActivityCoverField({
  draft,
  onChange,
}: {
  draft: ActivityDraft;
  onChange: (draft: ActivityDraft) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sessionIdRef = useRef(createLocalId());

  function onPick(file: File | null) {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("draftSessionId", sessionIdRef.current);
      const result = await uploadActivityCover(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange({ ...draft, coverImageUrl: result.publicUrl });
    });
  }

  return (
    <ActivityField label="Cover image">
      <div className="activity-create-wizard__cover">
        <button
          type="button"
          className={`activity-create-wizard__cover-drop${
            draft.coverImageUrl ? " activity-create-wizard__cover-drop--has-image" : ""
          }`}
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
        >
          {draft.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.coverImageUrl} alt="" className="activity-create-wizard__cover-img" />
          ) : (
            <span className="activity-create-wizard__cover-empty">
              <ImagePlus className="size-5" />
              {isPending ? "Uploading…" : "Add a cover"}
            </span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => onPick(event.target.files?.[0] ?? null)}
        />
        {draft.coverImageUrl ? (
          <button
            type="button"
            className="bd-btn-secondary mt-2"
            onClick={() => onChange({ ...draft, coverImageUrl: "" })}
          >
            Remove cover
          </button>
        ) : null}
        {error ? <p className="mt-2 text-sm text-amber-300">{error}</p> : null}
      </div>
    </ActivityField>
  );
}

export function PromosStep({
  draft,
  onChange,
}: {
  draft: ActivityDraft;
  onChange: (draft: ActivityDraft) => void;
}) {
  if (!draft.isPaid) {
    return (
      <div className="activity-create-wizard__panel text-sm text-white/60">
        Turn on paid tickets to create promo codes. Codes discount the ticket price before Stripe
        Checkout; Motiion syncs each code to Stripe for audit.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/55">
        Create Motiion promo codes for this event. Guests enter the code at booking; the discount
        applies to the ticket before fees are calculated.
      </p>
      {draft.promoCodes.map((promo, index) => (
        <div key={promo.id} className="activity-create-wizard__panel space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Code {index + 1}</p>
            <button
              type="button"
              className="bd-btn-secondary gap-1.5"
              onClick={() =>
                onChange({
                  ...draft,
                  promoCodes: draft.promoCodes.filter((item) => item.id !== promo.id),
                })
              }
            >
              <Trash2 className="size-3.5" />
              Remove
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ActivityField label="Code">
              <ActivityTextInput
                value={promo.code}
                placeholder="EARLYBIRD"
                onChange={(event) => {
                  const promoCodes = [...draft.promoCodes];
                  promoCodes[index] = {
                    ...promo,
                    code: event.target.value.toUpperCase(),
                  };
                  onChange({ ...draft, promoCodes });
                }}
              />
            </ActivityField>
            <ActivityField label="Type">
              <select
                className="w-full rounded-full border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none focus:border-white/30"
                value={promo.discountType}
                onChange={(event) => {
                  const promoCodes = [...draft.promoCodes];
                  promoCodes[index] = {
                    ...promo,
                    discountType: event.target.value === "fixed_cents" ? "fixed_cents" : "percent",
                  };
                  onChange({ ...draft, promoCodes });
                }}
              >
                <option value="percent">Percent off</option>
                <option value="fixed_cents">Fixed $ off</option>
              </select>
            </ActivityField>
            <ActivityField
              label={promo.discountType === "percent" ? "Percent" : "Amount (USD)"}
            >
              <ActivityTextInput
                type="number"
                min={promo.discountType === "percent" ? 1 : 0.5}
                max={promo.discountType === "percent" ? 100 : undefined}
                step={promo.discountType === "percent" ? 1 : 0.01}
                value={promo.discountValue}
                onChange={(event) => {
                  const promoCodes = [...draft.promoCodes];
                  promoCodes[index] = {
                    ...promo,
                    discountValue: Number(event.target.value) || 0,
                  };
                  onChange({ ...draft, promoCodes });
                }}
              />
            </ActivityField>
            <ActivityField label="Max redemptions">
              <ActivityTextInput
                type="number"
                min={1}
                value={promo.maxRedemptions ?? ""}
                placeholder="Unlimited"
                onChange={(event) => {
                  const promoCodes = [...draft.promoCodes];
                  promoCodes[index] = {
                    ...promo,
                    maxRedemptions: event.target.value ? Number(event.target.value) : null,
                  };
                  onChange({ ...draft, promoCodes });
                }}
              />
            </ActivityField>
            <ActivityField label="Expires">
              <ActivityTextInput
                type="date"
                value={promo.expiresAt}
                onChange={(event) => {
                  const promoCodes = [...draft.promoCodes];
                  promoCodes[index] = { ...promo, expiresAt: event.target.value };
                  onChange({ ...draft, promoCodes });
                }}
              />
            </ActivityField>
            <label className="activity-create-wizard__toggle self-end">
              <div>
                <p className="text-sm font-semibold text-white">Active</p>
              </div>
              <input
                type="checkbox"
                checked={promo.isActive}
                onChange={(event) => {
                  const promoCodes = [...draft.promoCodes];
                  promoCodes[index] = { ...promo, isActive: event.target.checked };
                  onChange({ ...draft, promoCodes });
                }}
                className="size-4 accent-[var(--accent)]"
              />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="bd-btn-secondary gap-1.5"
        onClick={() =>
          onChange({
            ...draft,
            promoCodes: [...draft.promoCodes, createDefaultPromoCode()],
          })
        }
      >
        <Plus className="size-4" />
        Add promo code
      </button>
    </div>
  );
}

export function LeadsStep({
  draft,
  onChange,
}: {
  draft: ActivityDraft;
  onChange: (draft: ActivityDraft) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="activity-create-wizard__toggle">
        <div>
          <p className="text-sm font-semibold text-white">Subgroup leads</p>
          <p className="text-xs text-white/50">
            Assign leads who facilitate their own private satellite event in the Motiion app
          </p>
        </div>
        <input
          type="checkbox"
          checked={draft.eventSubgroupsEnabled}
          onChange={(event) => {
            const enabled = event.target.checked;
            onChange({
              ...draft,
              eventSubgroupsEnabled: enabled,
              jobGroups:
                enabled && draft.jobGroups.length === 0
                  ? [createDefaultJobGroup({ name: "Featured" })]
                  : draft.jobGroups,
            });
          }}
          className="size-4 accent-[var(--accent)]"
        />
      </label>

      {draft.eventSubgroupsEnabled ? (
        <>
          <p className="text-sm text-white/55">
            Leads accept in the Motiion app, get a compsed main-event ticket, then set up their own
            private subgroup event for dancers they invite.
          </p>
          {draft.jobGroups.map((group, index) => (
            <div key={group.id} className="activity-create-wizard__panel space-y-3">
              <div className="flex items-center justify-between gap-2">
                <ActivityField label={`Subgroup ${index + 1}`}>
                  <ActivityTextInput
                    value={group.name}
                    placeholder="e.g. Featured, Ensemble"
                    onChange={(event) => {
                      const jobGroups = [...draft.jobGroups];
                      jobGroups[index] = { ...group, name: event.target.value };
                      onChange({ ...draft, jobGroups });
                    }}
                  />
                </ActivityField>
                {draft.jobGroups.length > 1 ? (
                  <button
                    type="button"
                    className="bd-btn-secondary mt-5"
                    onClick={() =>
                      onChange({
                        ...draft,
                        jobGroups: draft.jobGroups.filter((item) => item.id !== group.id),
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <ActivityPeoplePicker
                label="Invite leads"
                selected={group.leadInvitees}
                emptyHint="Search and add leads for this subgroup."
                onChange={(leadInvitees) => {
                  const jobGroups = [...draft.jobGroups];
                  jobGroups[index] = { ...group, leadInvitees };
                  onChange({ ...draft, jobGroups });
                }}
              />
            </div>
          ))}
          <button
            type="button"
            className="bd-btn-secondary gap-1.5"
            onClick={() =>
              onChange({
                ...draft,
                jobGroups: [...draft.jobGroups, createDefaultJobGroup()],
              })
            }
          >
            <Plus className="size-4" />
            Add subgroup
          </button>
        </>
      ) : (
        <div className="activity-create-wizard__panel text-sm text-white/55">
          Optional. Enable when your event has cast leads who should run their own invite-only
          satellite experience under this showcase.
        </div>
      )}
    </div>
  );
}
