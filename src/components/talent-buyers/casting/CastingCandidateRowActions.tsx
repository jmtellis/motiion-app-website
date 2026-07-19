"use client";

import type { ReactNode } from "react";
import {
  CalendarClock,
  ClipboardList,
  Download,
  ImageDown,
  Mail,
} from "lucide-react";

import type { CastingCandidate } from "@/lib/talent-buyers/casting/casting-types";
import { useTalentOutreachActions } from "@/lib/talent-buyers/use-talent-outreach-actions";

import { Modal } from "../dashboard/Modal";
import { useToast } from "../dashboard/ToastProvider";

type CastingCandidateRowActionsProps = {
  candidate: CastingCandidate;
  projectId: string;
  projectTitle: string;
};

const INPUT_CLASS =
  "w-full rounded-full border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30 focus:outline-none";

const TEXTAREA_CLASS =
  "w-full rounded-[var(--radius-field)] border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30 focus:outline-none";

const MOTION_ACCOUNT_TOOLTIP = "Requires a Motiion account";

function ActionButton({
  label,
  disabled,
  disabledTitle,
  onClick,
  children,
  href,
  download,
}: {
  label: string;
  disabled?: boolean;
  disabledTitle?: string;
  onClick?: () => void;
  children: ReactNode;
  href?: string;
  download?: boolean;
}) {
  const className = "casting-table-row__action";
  const title = disabled ? (disabledTitle ?? label) : label;

  if (href && !disabled) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={label}
        title={title}
        download={download}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function CastingCandidateRowActions({
  candidate,
  projectId,
  projectTitle,
}: CastingCandidateRowActionsProps) {
  const { showToast } = useToast();
  const {
    canReachTalent,
    isPending,
    availabilityModalOpen,
    setAvailabilityModalOpen,
    sizeSheetModalOpen,
    setSizeSheetModalOpen,
    availabilityTitle,
    setAvailabilityTitle,
    availabilityMessage,
    setAvailabilityMessage,
    availabilityProject,
    setAvailabilityProject,
    sizeSheetMessage,
    setSizeSheetMessage,
    handleMessage,
    openAvailabilityModal,
    openSizeSheetModal,
    handleAvailabilitySubmit,
    handleSizeSheetSubmit,
  } = useTalentOutreachActions({
    talentUserId: candidate.talentUserId,
    displayName: candidate.displayName,
    projectId,
    projectTitle,
    onSuccess: (message) => showToast({ message, variant: "success" }),
    onError: (message) => showToast({ message, variant: "error" }),
  });

  const resumeUrl = candidate.resumeUrl?.trim() || null;
  const headshotUrl = candidate.headshotUrl?.trim() || null;

  return (
    <>
      <div className="casting-table-row__actions" onClick={(event) => event.stopPropagation()}>
        <ActionButton
          label="Message"
          disabled={!canReachTalent || isPending}
          disabledTitle={MOTION_ACCOUNT_TOOLTIP}
          onClick={handleMessage}
        >
          <Mail className="size-3.5" aria-hidden />
        </ActionButton>
        <ActionButton
          label="Check availability"
          disabled={!canReachTalent || isPending}
          disabledTitle={MOTION_ACCOUNT_TOOLTIP}
          onClick={openAvailabilityModal}
        >
          <CalendarClock className="size-3.5" aria-hidden />
        </ActionButton>
        <ActionButton
          label="Request size sheet"
          disabled={!canReachTalent || isPending}
          disabledTitle={MOTION_ACCOUNT_TOOLTIP}
          onClick={openSizeSheetModal}
        >
          <ClipboardList className="size-3.5" aria-hidden />
        </ActionButton>
        <ActionButton
          label="Download resume"
          disabled={!resumeUrl}
          disabledTitle="No resume available"
          href={resumeUrl ?? undefined}
          download
        >
          <Download className="size-3.5" aria-hidden />
        </ActionButton>
        <ActionButton
          label="Download headshot"
          disabled={!headshotUrl}
          disabledTitle="No headshot available"
          href={headshotUrl ?? undefined}
          download
        >
          <ImageDown className="size-3.5" aria-hidden />
        </ActionButton>
      </div>

      <Modal
        open={availabilityModalOpen}
        onClose={() => setAvailabilityModalOpen(false)}
        title="Ask Availability"
        description={`Send an availability check to ${candidate.displayName}.`}
        footer={
          <button
            type="button"
            className="bd-btn-accent"
            disabled={isPending}
            onClick={handleAvailabilitySubmit}
          >
            Send request
          </button>
        }
      >
        <div className="space-y-3">
          <input
            type="text"
            className={INPUT_CLASS}
            value={availabilityTitle}
            onChange={(event) => setAvailabilityTitle(event.target.value)}
            placeholder="Request title"
          />
          <input
            type="text"
            className={INPUT_CLASS}
            value={availabilityProject}
            onChange={(event) => setAvailabilityProject(event.target.value)}
            placeholder="Project name (optional)"
          />
          <textarea
            className={`${TEXTAREA_CLASS} min-h-24 resize-y`}
            value={availabilityMessage}
            onChange={(event) => setAvailabilityMessage(event.target.value)}
            placeholder="Dates, notes, or context (optional)"
          />
        </div>
      </Modal>

      <Modal
        open={sizeSheetModalOpen}
        onClose={() => setSizeSheetModalOpen(false)}
        title="Request Size Sheet"
        description={`Ask ${candidate.displayName} to share their measurements.`}
        footer={
          <button
            type="button"
            className="bd-btn-accent"
            disabled={isPending}
            onClick={handleSizeSheetSubmit}
          >
            Send request
          </button>
        }
      >
        <textarea
          className={`${TEXTAREA_CLASS} min-h-24 resize-y`}
          value={sizeSheetMessage}
          onChange={(event) => setSizeSheetMessage(event.target.value)}
          placeholder="Optional note for the talent"
        />
      </Modal>
    </>
  );
}
