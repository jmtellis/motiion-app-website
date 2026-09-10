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
import type { ActivityDraft, DraftPersonRef } from "@/lib/talent-buyers/activities/types";

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

export function FeaturedTalentStep({
  draft,
  onChange,
}: {
  draft: ActivityDraft;
  onChange: (draft: ActivityDraft) => void;
}) {
  const level1 = draft.featuredTalentInvites.filter((invite) => !invite.parentLocalId);
  const selectedLevel1: DraftPersonRef[] = level1.map((invite) => ({
    userId: invite.talentUserId,
    displayName: invite.displayName,
    headshotUrl: invite.headshotUrl,
  }));

  function setLevel1People(people: DraftPersonRef[]) {
    const keptLocalIds = new Set(
      level1
        .filter((invite) => people.some((person) => person.userId === invite.talentUserId))
        .map((invite) => invite.localId),
    );
    const existingByUser = new Map(level1.map((invite) => [invite.talentUserId, invite]));
    const nextLevel1 = people.map((person) => {
      const existing = existingByUser.get(person.userId);
      if (existing) return existing;
      return {
        localId: createLocalId(),
        talentUserId: person.userId,
        displayName: person.displayName,
        headshotUrl: person.headshotUrl,
        parentLocalId: null,
      };
    });
    const children = draft.featuredTalentInvites.filter(
      (invite) => invite.parentLocalId && keptLocalIds.has(invite.parentLocalId),
    );
    onChange({ ...draft, featuredTalentInvites: [...nextLevel1, ...children] });
  }

  function setChildrenForParent(parentLocalId: string, people: DraftPersonRef[]) {
    const others = draft.featuredTalentInvites.filter(
      (invite) => invite.parentLocalId !== parentLocalId,
    );
    const children = people.map((person) => ({
      localId: createLocalId(),
      talentUserId: person.userId,
      displayName: person.displayName,
      headshotUrl: person.headshotUrl,
      parentLocalId,
    }));
    onChange({ ...draft, featuredTalentInvites: [...others, ...children] });
  }

  return (
    <div className="space-y-4">
      <div className="activity-create-wizard__panel space-y-2 text-sm text-white/60">
        <p className="font-semibold text-white">Featured talent</p>
        <p>
          Invite talent who will be featured at this event. They must accept before appearing on
          the public page. Featured talent can then invite supporting talent under them.
        </p>
      </div>

      <ActivityPeoplePicker
        label="Featured talent"
        talentOnly
        selected={selectedLevel1}
        emptyHint="Search talent by name or username."
        placeholder="Search talent by name or username"
        onChange={setLevel1People}
      />

      {level1.map((parent) => {
        const children = draft.featuredTalentInvites.filter(
          (invite) => invite.parentLocalId === parent.localId,
        );
        const selectedChildren: DraftPersonRef[] = children.map((invite) => ({
          userId: invite.talentUserId,
          displayName: invite.displayName,
          headshotUrl: invite.headshotUrl,
        }));
        return (
          <div key={parent.localId} className="activity-create-wizard__panel space-y-3">
            <p className="text-sm font-semibold text-white">
              Under {parent.displayName}
            </p>
            <p className="text-xs text-white/50">
              Optional — dancers or other talent performing in their showcase.
            </p>
            <ActivityPeoplePicker
              label="Supporting talent"
              talentOnly
              selected={selectedChildren}
              emptyHint="No supporting talent yet."
              placeholder="Search talent to add under them"
              onChange={(people) => setChildrenForParent(parent.localId, people)}
            />
          </div>
        );
      })}
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
      <div className="activity-create-wizard__panel space-y-2 text-sm text-white/60">
        <p className="font-semibold text-white">Add leads to this event</p>
        <p>
          Invite Motiion members as cast or subgroup leads. Search by their name or username below
          — you do not need Talent Search. They accept in the Motiion app, get a compsed main-event
          ticket, then set up their own private satellite event.
        </p>
      </div>

      <label className="activity-create-wizard__toggle">
        <div>
          <p className="text-sm font-semibold text-white">Invite leads now</p>
          <p className="text-xs text-white/50">
            Optional — you can also add leads anytime after publishing from the event Leads tab.
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
          {draft.jobGroups.map((group, index) => (
            <div key={group.id} className="activity-create-wizard__panel space-y-3">
              <div className="flex items-center justify-between gap-2">
                <ActivityField label={`Group ${index + 1}`}>
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
                label="Add leads"
                selected={group.leadInvitees}
                emptyHint="Type a Motiion member's name, then select them to add."
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
            Add group
          </button>
        </>
      ) : (
        <div className="activity-create-wizard__panel text-sm text-white/55">
          Skip for now if you are not ready. After you publish, open the event and use the{" "}
          <span className="text-white/80">Leads</span> tab to search Motiion members and send
          invites.
        </div>
      )}
    </div>
  );
}
