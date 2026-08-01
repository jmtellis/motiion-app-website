"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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

  useEffect(() => {
    if (!inviteModalOpen) return;
    setInviteLoading(true);
    void listBuyerCastingTargets().then((result) => {
      setInviteTargets(result.targets);
      setInviteLoading(false);
      if (result.error) showToast({ message: result.error, variant: "error" });
    });
  }, [inviteModalOpen, showToast]);

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        showToast({ message: success, variant: "success" });
      } else {
        showToast({ message: result.error ?? "Something went wrong.", variant: "error" });
      }
    });
  }

  function handleInvite(target: CastingInviteTarget) {
    if (!requirePro("talent_outreach")) return;
    startTransition(async () => {
      const result = await inviteTalentFromNavigator(talentSlug, {
        projectId: target.projectId,
        castingId: target.castingId,
      });
      if (result.ok) {
        showToast({ message: `Invite sent to ${displayName}`, variant: "success" });
        setInviteModalOpen(false);
      } else {
        showToast({ message: result.error ?? "Could not send invite.", variant: "error" });
      }
    });
  }

  function handleContact() {
    if (!requirePro("talent_outreach")) return;
    runWithIdentity(() => {
      startTransition(async () => {
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
    );
    setAvailabilityModalOpen(false);
  }

  function handleSizeSheetSubmit() {
    if (!requirePro("talent_outreach")) return;
    runAction(
      () => requestTalentSizeSheet({ talentUserId, message: sizeSheetMessage }),
      `Size sheet request sent to ${displayName}`,
    );
    setSizeSheetModalOpen(false);
  }

  function openOutreach(setter: (value: boolean) => void) {
    if (!requirePro("talent_outreach")) return;
    setter(true);
  }

  function openSave() {
    setSaveOpen((value) => !value);
  }

  const inputClass =
    "w-full rounded-full border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30 focus:outline-none";
  const textareaClass =
    "w-full rounded-[var(--radius-field)] border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/30 focus:outline-none";

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
                onClick={() => openOutreach(setInviteModalOpen)}
              >
                <CalendarPlus className="size-3.5" aria-hidden />
                <ProLockHint />
                Add to Project
              </button>
              <button
                type="button"
                className="btp-action-btn btp-action-btn--block"
                disabled={isPending}
                onClick={() => openOutreach(setInviteModalOpen)}
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
          <p className="text-sm text-white/45">Loading your castings…</p>
        ) : inviteTargets.length ? (
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {inviteTargets.map((target) => (
              <li key={`${target.projectId}-${target.castingId ?? "project"}`}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-white/10 bg-white/4 px-4 py-3 text-left text-sm font-medium text-white/85 transition hover:border-[color-mix(in_oklab,var(--accent)_30%,transparent)] hover:bg-white/8"
                  disabled={isPending}
                  onClick={() => handleInvite(target)}
                >
                  {target.title}
                  {target.castingId ? null : (
                    <span className="ml-2 text-xs font-normal text-white/45">project invite</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/50">Create a project or casting first to send invites.</p>
        )}
      </Modal>

      <Modal
        open={availabilityModalOpen}
        onClose={() => setAvailabilityModalOpen(false)}
        title="Ask Availability"
        description={`Send an availability check to ${displayName}.`}
        footer={
          <button type="button" className="bd-btn-accent" disabled={isPending} onClick={handleAvailabilitySubmit}>
            Send request
          </button>
        }
      >
        <div className="space-y-3">
          <input
            type="text"
            className={inputClass}
            value={availabilityTitle}
            onChange={(event) => setAvailabilityTitle(event.target.value)}
            placeholder="Request title"
          />
          <input
            type="text"
            className={inputClass}
            value={availabilityProject}
            onChange={(event) => setAvailabilityProject(event.target.value)}
            placeholder="Project name (optional)"
          />
          <textarea
            className={`${textareaClass} min-h-24 resize-y`}
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
        description={`Ask ${displayName} to share their measurements.`}
        footer={
          <button type="button" className="bd-btn-accent" disabled={isPending} onClick={handleSizeSheetSubmit}>
            Send request
          </button>
        }
      >
        <textarea
          className={`${textareaClass} min-h-24 resize-y`}
          value={sizeSheetMessage}
          onChange={(event) => setSizeSheetMessage(event.target.value)}
          placeholder="Optional note for the talent"
        />
      </Modal>
      {gate}
    </>
  );
}
