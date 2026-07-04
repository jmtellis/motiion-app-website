"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  CalendarPlus,
  Mail,
  Send,
  X,
} from "lucide-react";

import { getTalentProfileHref } from "@/lib/talent-navigator/profile-adapter";
import type { Talent } from "@/lib/talent-navigator/types";

import { StyleChips } from "./StyleChips";

type ActiveTalentPanelProps = {
  talent: Talent | null;
  open?: boolean;
  onSave?: () => void;
  onInvite?: () => void;
  onContact?: () => void;
  onAddToProject?: () => void;
  onClose?: () => void;
  compact?: boolean;
  variant?: "sidebar" | "sheet";
};

function MetaRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="talent-navigator__meta-row">
      <dt>{label}</dt>
      <dd className={highlight ? "talent-navigator__meta--available" : undefined}>{value}</dd>
    </div>
  );
}

function TalentIdentityHeader({
  talent,
  onClose,
  compactAvatar,
}: {
  talent: Talent;
  onClose?: () => void;
  compactAvatar?: boolean;
}) {
  return (
    <div className="talent-navigator__detail-header">
      <div className="talent-navigator__detail-identity">
        <div
          className={`talent-navigator__detail-avatar${compactAvatar ? " talent-navigator__detail-avatar--compact" : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={talent.imageUrl} alt="" />
        </div>
        <div className="talent-navigator__detail-identity-text">
          <div className="talent-navigator__detail-name-row">
            <h3 className="talent-navigator__detail-name">{talent.name}</h3>
            {talent.pronouns ? (
              <span className="talent-navigator__detail-pronouns">{talent.pronouns}</span>
            ) : null}
          </div>
          <p className="talent-navigator__detail-location">{talent.location ?? "Location TBD"}</p>
        </div>
      </div>
      {onClose ? (
        <button
          type="button"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-white/45 hover:bg-white/6 hover:text-white/80"
          onClick={onClose}
          aria-label="Close details"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export function ActiveTalentPanel({
  talent,
  open = false,
  onSave,
  onInvite,
  onContact,
  onAddToProject,
  onClose,
  compact = false,
  variant = "sidebar",
}: ActiveTalentPanelProps) {
  const useCompactHeader = variant === "sidebar" || compact;

  const inner = !talent ? (
    <div className="flex flex-1 items-center justify-center p-6">
      <p className="text-sm text-white/45">Select a dancer to view details.</p>
    </div>
  ) : (
    <div key={talent.id} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <TalentIdentityHeader
          talent={talent}
          onClose={onClose}
          compactAvatar={useCompactHeader}
        />

        {!useCompactHeader ? (
          <div className="mx-4 mt-3 overflow-hidden rounded-xl border border-white/8 bg-black/50">
            <div className="relative aspect-[3/4] max-h-48 w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={talent.imageUrl} alt="" className="h-full w-full object-contain object-center" />
            </div>
          </div>
        ) : null}

        <div className="space-y-3 px-4 py-3">
          <StyleChips key={talent.id} styles={talent.styles} />

          <dl>
            {talent.agency ? <MetaRow label="Agency" value={talent.agency} /> : null}
            {talent.height ? <MetaRow label="Height" value={talent.height} /> : null}
            {talent.availability ? (
              <MetaRow
                label="Availability"
                value={
                  talent.availability.toLowerCase().includes("available")
                    ? "Available Now"
                    : talent.availability
                }
                highlight={talent.availability.toLowerCase().includes("available")}
              />
            ) : null}
            {talent.unionStatus ? <MetaRow label="Union Status" value={talent.unionStatus} /> : null}
            {talent.experience ? <MetaRow label="Experience" value={talent.experience} /> : null}
          </dl>

          <div className="talent-navigator__detail-actions">
            <Link
              href={getTalentProfileHref(talent)}
              className="talent-navigator__action-btn talent-navigator__action-btn--accent talent-navigator__action-btn--block talent-navigator__action-btn--full"
            >
              View Profile
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <button type="button" className="talent-navigator__action-btn talent-navigator__action-btn--block" onClick={onSave}>
              <Bookmark className="size-3.5" aria-hidden />
              Save to Roster
            </button>
            <button type="button" className="talent-navigator__action-btn talent-navigator__action-btn--block" onClick={onAddToProject}>
              <CalendarPlus className="size-3.5" aria-hidden />
              Add to Project
            </button>
            <button type="button" className="talent-navigator__action-btn talent-navigator__action-btn--block" onClick={onInvite}>
              <Send className="size-3.5" aria-hidden />
              Just Invite
            </button>
            <button type="button" className="talent-navigator__action-btn talent-navigator__action-btn--block" onClick={onContact}>
              <Mail className="size-3.5" aria-hidden />
              Contact
            </button>
          </div>
        </div>
    </div>
  );

  if (variant === "sheet") {
    return (
      <div className="flex min-h-0 flex-col overflow-hidden" aria-label="Talent details">
        {inner}
      </div>
    );
  }

  return (
    <div
      className={`talent-navigator__detail-wrap${open ? " talent-navigator__detail-wrap--open" : ""}`}
      aria-label="Talent details"
      aria-hidden={!open}
    >
      <div className="talent-navigator__detail-card">{inner}</div>
    </div>
  );
}
