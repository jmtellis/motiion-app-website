"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  Bookmark,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  Download,
  Mail,
  Send,
} from "lucide-react";

import {
  askTalentAvailability,
  contactTalentUser,
  inviteTalentFromNavigator,
  listBuyerCastingTargets,
  requestTalentSizeSheet,
  type CastingInviteTarget,
} from "@/app/(buyer-app)/(paid)/talent/actions";
import type { PublicTalentProfile } from "@/types/public";

import { Field } from "@/components/ui/Field";

import { Modal } from "./dashboard/Modal";
import { useToast } from "./dashboard/ToastProvider";
import { SaveToCollectionPopover } from "./library/SaveToCollectionPopover";
import { useIndustryIdentityGate } from "./IndustryIdentityGate";
import { ProLockHint } from "@/components/talent-buyers/billing/ProLockHint";
import { useIndustryPro } from "@/components/talent-buyers/billing/IndustryProContext";
import { isIndustryIdentityRequiredError } from "@/lib/talent-buyers/industry-identity-errors";

type TalentProfileActionsProps = {
  profile: PublicTalentProfile;
};

export function TalentProfileActions({ profile }: TalentProfileActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { runWithIdentity, gate } = useIndustryIdentityGate("contact");
  const { requirePro } = useIndustryPro();

  const [saveOpen, setSaveOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [sizeSheetModalOpen, setSizeSheetModalOpen] = useState(false);

  const [inviteTargets, setInviteTargets] = useState<CastingInviteTarget[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [availabilityTitle, setAvailabilityTitle] = useState("Availability check");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [availabilityProject, setAvailabilityProject] = useState("");
  const [sizeSheetMessage, setSizeSheetMessage] = useState("");

  const talentUserId = profile.user_id ?? profile.id;
  const talentSlug = profile.username?.trim() || profile.id;
  /** Prefer user id / professional id — Library resolves against professional_profiles. */
  const talentSaveKeys = [talentUserId, profile.id, talentSlug].filter(Boolean) as string[];
  const displayName = profile.full_name?.trim() || "Talent";
  const resumeUrl = profile.resume_url?.trim() || null;

  const inviteRequest = useRef(0);

  async function openInvite() {
    if (!requirePro("talent_outreach")) return;
    const request = ++inviteRequest.current;
    setInviteModalOpen(true);
    setInviteLoading(true);
    setInviteError(null);
    try {
      const result = await listBuyerCastingTargets();
      if (request !== inviteRequest.current) return;
      setInviteTargets(result.targets);
      if (result.error) setInviteError(result.error);
    } catch {
      if (request === inviteRequest.current) setInviteError("Could not load projects. Please try again.");
    } finally {
      if (request === inviteRequest.current) setInviteLoading(false);
    }
  }

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>, success: string, onSuccess?: () => void) {
    startTransition(async () => {
      try {
        const result = await action();
        showToast({ message: result.ok ? success : result.error ?? "Something went wrong.", variant: result.ok ? "success" : "error" });
        if (result.ok) onSuccess?.();
      } catch {
        showToast({ message: "Could not complete this action. Please try again.", variant: "error" });
      }
    });
  }

  function handleInvite(target: CastingInviteTarget) {
    if (!requirePro("talent_outreach")) return;
    runAction(
      () => inviteTalentFromNavigator(talentSlug, { projectId: target.projectId, castingId: target.castingId }),
      `Invite sent to ${displayName}`,
      () => setInviteModalOpen(false),
    );
  }

  function handleContact() {
    if (!requirePro("talent_outreach")) return;
    runWithIdentity(() => {
      startTransition(async () => {
        try {
        const result = await contactTalentUser(talentUserId);
        if (result.ok && result.conversationId) {
          router.push(`/messages?conversation=${result.conversationId}`);
          return;
        }
        if (result.ok && result.pendingRequest) {
          showToast({ message: `Message request sent to ${displayName}`, variant: "success" });
          return;
        }
        if (isIndustryIdentityRequiredError(result)) {
          showToast({
            message: result.error ?? "Verify your identity to contact talent.",
            variant: "error",
          });
          return;
        }
        showToast({ message: result.error ?? "Could not start a conversation.", variant: "error" });
        } catch {
          showToast({ message: "Could not start a conversation. Please try again.", variant: "error" });
        }
      });
    });
  }

  function handleAvailabilitySubmit() {
    if (!requirePro("talent_outreach")) return;
    runAction(
      () =>
        askTalentAvailability({
          talentUserId,
          title: availabilityTitle,
          message: availabilityMessage,
          projectName: availabilityProject,
        }),
      `Availability request sent to ${displayName}`,
      () => setAvailabilityModalOpen(false),
    );
  }

  function handleSizeSheetSubmit() {
    if (!requirePro("talent_outreach")) return;
    runAction(
      () => requestTalentSizeSheet({ talentUserId, message: sizeSheetMessage }),
      `Size sheet request sent to ${displayName}`,
      () => setSizeSheetModalOpen(false),
    );
  }

  function openOutreach(setter: (value: boolean) => void) {
    if (!requirePro("talent_outreach")) return;
    setter(true);
  }

  function openSave() {
    setSaveOpen((value) => !value);
  }

  return (
    <>
      <aside className="buyer-talent-profile__sidebar" aria-label="Talent actions">
        <div className="buyer-talent-profile__sidebar-inner" data-lenis-prevent>
          <section className="buyer-talent-profile__sidebar-section">
            <h2 className="buyer-talent-profile__sidebar-title">Actions</h2>
            <div className="buyer-talent-profile__sidebar-actions">
              <SaveToCollectionPopover
                open={saveOpen}
                onClose={() => setSaveOpen(false)}
                talentIdOrSlug={talentSaveKeys}
                displayName={displayName}
                trigger={
                  <button
                    type="button"
                    className="btp-action-btn btp-action-btn--block"
                    disabled={isPending}
                    onClick={openSave}
                  >
                    <Bookmark className="size-3.5" aria-hidden />
                    <ProLockHint />
                    Save to Library
                  </button>
                }
              />
              <button
                type="button"
                className="btp-action-btn btp-action-btn--block"
                disabled={isPending}
                onClick={() => void openInvite()}
              >
                <CalendarPlus className="size-3.5" aria-hidden />
                <ProLockHint />
                Add to Project
              </button>
              <button
                type="button"
                className="btp-action-btn btp-action-btn--block"
                disabled={isPending}
                onClick={() => void openInvite()}
              >
                <Send className="size-3.5" aria-hidden />
                <ProLockHint />
                Just Invite
              </button>
              <button
                type="button"
                className="btp-action-btn btp-action-btn--block"
                disabled={isPending}
                onClick={() => openOutreach(setAvailabilityModalOpen)}
              >
                <CalendarClock className="size-3.5" aria-hidden />
                <ProLockHint />
                Ask Availability
              </button>
              <button
                type="button"
                className="btp-action-btn btp-action-btn--block"
                disabled={isPending}
                onClick={() => openOutreach(setSizeSheetModalOpen)}
              >
                <ClipboardList className="size-3.5" aria-hidden />
                <ProLockHint />
                Request Size Sheet
              </button>
              {resumeUrl ? (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btp-action-btn btp-action-btn--block btp-action-btn--accent"
                  download
                >
                  <Download className="size-3.5" aria-hidden />
                  Download Resume
                </a>
              ) : (
                <button
                  type="button"
                  className="btp-action-btn btp-action-btn--block"
                  disabled
                  aria-disabled="true"
                >
                  <Download className="size-3.5" aria-hidden />
                  Download Resume
                </button>
              )}
              <button
                type="button"
                className="btp-action-btn btp-action-btn--block"
                disabled={isPending}
                onClick={handleContact}
              >
                <Mail className="size-3.5" aria-hidden />
                <ProLockHint />
                Contact
              </button>
            </div>
          </section>
        </div>
      </aside>

      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={`Invite ${displayName}`}
        description="Choose a casting or project."
      >
        {inviteLoading ? (
          <p className="text-sm text-[var(--ink-soft)]">Loading your castings…</p>
        ) : inviteError ? (
          <div role="alert" className="space-y-3 text-sm text-[var(--ink)]"><p>{inviteError}</p><button type="button" className="ui-button" onClick={() => void openInvite()}>Try again</button></div>
        ) : inviteTargets.length ? (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {inviteTargets.map((target) => (
              <li key={`${target.projectId}-${target.castingId ?? "project"}`}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-card)] px-4 py-3 text-left text-sm font-medium text-[var(--ink)] transition hover:border-[color-mix(in_oklab,var(--accent)_30%,transparent)] hover:bg-[var(--tone)]"
                  disabled={isPending}
                  onClick={() => handleInvite(target)}
                >
                  {target.title}
                  {target.castingId ? null : (
                    <span className="ml-2 text-xs font-normal text-[var(--ink-soft)]">project invite</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">Create a project or casting first to send invites.</p>
        )}
      </Modal>

      <Modal
        open={availabilityModalOpen}
        onClose={() => setAvailabilityModalOpen(false)}
        title="Ask Availability"
        description={`Send an availability check to ${displayName}.`}
        footer={
          <button type="button" className="bd-btn-accent" disabled={isPending} onClick={handleAvailabilitySubmit}>
            {isPending ? "Sending…" : "Send request"}
          </button>
        }
      >
        <div className="space-y-3">
          <Field label="Request title"><input
            type="text"
            value={availabilityTitle}
            onChange={(event) => setAvailabilityTitle(event.target.value)}
            aria-label="Request title"
            disabled={isPending}
            placeholder="Request title"
          /></Field>
          <Field label="Project name (optional)"><input
            type="text"
            value={availabilityProject}
            onChange={(event) => setAvailabilityProject(event.target.value)}
            aria-label="Project name (optional)"
            disabled={isPending}
            placeholder="Project name (optional)"
          /></Field>
          <Field label="Dates, notes, or context (optional)"><textarea
            value={availabilityMessage}
            onChange={(event) => setAvailabilityMessage(event.target.value)}
            aria-label="Dates, notes, or context (optional)"
            disabled={isPending}
            placeholder="Dates, notes, or context (optional)"
          /></Field>
        </div>
      </Modal>

      <Modal
        open={sizeSheetModalOpen}
        onClose={() => setSizeSheetModalOpen(false)}
        title="Request Size Sheet"
        description={`Ask ${displayName} to share their measurements.`}
        footer={
          <button type="button" className="bd-btn-accent" disabled={isPending} onClick={handleSizeSheetSubmit}>
            {isPending ? "Sending…" : "Send request"}
          </button>
        }
      >
        <Field label="Note (optional)"><textarea
          value={sizeSheetMessage}
          onChange={(event) => setSizeSheetMessage(event.target.value)}
          aria-label="Optional note for the talent"
          disabled={isPending}
          placeholder="Optional note for the talent"
        /></Field>
      </Modal>
      {gate}
    </>
  );
}
