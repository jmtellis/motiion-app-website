"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";

import {
  loadTalentCastingDetail,
  passCastingRole,
  respondToCastingRequest,
  type TalentCastingDetail,
} from "@/app/(app)/opportunities/actions";
import {
  CompensationSection,
  OrganizerRow,
  RoleDetailPanel,
  ScheduleSection,
} from "@/components/casting/CastingSections";
import { WorkspaceSidePanel } from "@/components/workspace/WorkspaceSidePanel";
import { submitToCastingRole } from "@/lib/casting/submit";
import { outcomeLabel, roleSubmitState } from "@/lib/app/talent-casting-state";
import { formatCastingDeadline } from "@/lib/publicCasting";
import type { PublicCastingRole } from "@/types/public";

import "@/app/casting/casting.css";

export function CastingDetailPanel({
  roleId,
  open,
  preferRole = false,
  onClose,
}: {
  roleId: string | null;
  open: boolean;
  preferRole?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const requestKey = open && roleId ? `${roleId}:${preferRole ? "role" : "project"}` : null;
  const [loaded, setLoaded] = useState<{
    key: string;
    detail: TalentCastingDetail | null;
    error: string | null;
  } | null>(null);
  const [view, setView] = useState<"project" | "role">("project");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);
  const [busy, setBusy] = useState(false);
  const loading = Boolean(requestKey) && loaded?.key !== requestKey;
  const detail = loaded?.key === requestKey ? loaded.detail : null;
  const error = loaded?.key === requestKey ? loaded.error : null;

  useEffect(() => {
    if (!requestKey || !roleId) return;
    let cancelled = false;
    void loadTalentCastingDetail(roleId).then((result) => {
      if (cancelled) return;
      const casting = result.detail?.casting;
      const match = casting?.roles.find((role) => role.id === roleId)?.id ?? casting?.selectedRoleId ?? casting?.roles[0]?.id ?? null;
      setLoaded({ key: requestKey, detail: result.detail, error: result.error });
      setSelectedRoleId(match);
      setView(preferRole ? "role" : "project");
      setConfirming(false);
      setActionError(null);
      setNote("");
      setAnswers({});
    });
    return () => {
      cancelled = true;
    };
  }, [preferRole, requestKey, roleId]);

  const casting = detail?.casting ?? null;
  const selectedRole = casting?.roles.find((role) => role.id === selectedRoleId) ?? null;
  const submission = selectedRole ? detail?.submissionsByRoleId[selectedRole.id] : undefined;
  const invited = Boolean(selectedRole && detail?.inviteByRoleId[selectedRole.id]);
  const submitState = selectedRole
    ? roleSubmitState({
        alreadySubmitted: Boolean(submission),
        isActive: selectedRole.isActive,
        isCastingFinalized: selectedRole.isCastingFinalized,
        deadlinePassed: detail?.deadlinePassed ?? false,
        externalSubmissionUrl: casting?.externalSubmissionURL ?? null,
        invited,
        hasAgency: detail?.hasAgency ?? false,
        agencyRequired: detail?.agencyRequiredByRoleId[selectedRole.id] ?? false,
        submitterPolicy: detail?.submitterPolicy ?? null,
        visibilityPresentation: detail?.visibilityPresentation ?? null,
      })
    : null;
  const requiredMissing = (detail?.questions ?? []).some(
    (question) => question.required && !(answers[question.id] ?? "").trim(),
  );

  async function refresh() {
    if (!roleId || !requestKey) return;
    const result = await loadTalentCastingDetail(roleId);
    setLoaded({ key: requestKey, detail: result.detail, error: result.error });
    router.refresh();
  }

  async function submit() {
    if (!selectedRole || requiredMissing) return;
    setBusy(true);
    setActionError(null);
    setUpgrade(false);
    const result = await submitToCastingRole({
      roleId: selectedRole.id,
      note,
      supplementalAnswers: answers,
    });
    if (!result.ok) {
      setBusy(false);
      setActionError(result.message);
      setUpgrade(Boolean(result.upgrade));
      return;
    }
    const inviteId = detail?.inviteByRoleId[selectedRole.id];
    if (inviteId) await respondToCastingRequest(inviteId, "primary");
    setConfirming(false);
    setBusy(false);
    await refresh();
  }

  async function passOrDecline() {
    if (!selectedRole || !detail) return;
    setBusy(true);
    setActionError(null);
    const inviteId = detail.inviteByRoleId[selectedRole.id];
    const result = inviteId
      ? await respondToCastingRequest(inviteId, "negative")
      : await passCastingRole(selectedRole.id);
    setBusy(false);
    if (!result.ok) {
      setActionError(result.error ?? "Could not update this casting.");
      return;
    }
    onClose();
    router.refresh();
  }

  const leading =
    view === "role" && casting ? (
      <button type="button" className="opportunities-back" onClick={() => { setView("project"); setConfirming(false); }} aria-label="Back to casting">
        <ChevronLeft size={18} aria-hidden />
      </button>
    ) : null;

  return (
    <WorkspaceSidePanel
      id="casting-detail-panel"
      open={open}
      title={view === "role" && selectedRole ? selectedRole.title : casting?.title ?? "Casting"}
      onClose={onClose}
      leading={leading}
    >
      <div className="opportunities-detail">
        {loading ? <p className="opportunities-detail__status">Loading casting…</p> : null}
        {error ? <p className="opportunities-detail__status" role="alert">{error}</p> : null}
        {casting && view === "project" ? (
          <ProjectView
            detail={detail!}
            onOpenRole={(role) => {
              setSelectedRoleId(role.id);
              setView("role");
              setConfirming(false);
            }}
          />
        ) : null}
        {casting && view === "role" && selectedRole ? (
          <div className="opportunities-detail__stack">
            <RoleDetailPanel role={selectedRole} />
            {submission ? (
              <p className="opportunities-outcome" data-outcome={submission.outcome}>
                {outcomeLabel(submission.outcome)}
                {submission.submittedAt ? <span> · {submittedOn(submission.submittedAt)}</span> : null}
              </p>
            ) : null}
            {confirming && submitState?.kind === "submit" ? (
              <form
                className="opportunities-submit"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <p>Your Motiion profile will be sent with this submission.</p>
                {detail?.questions.map((question) => (
                  <label key={question.id}>
                    <span>
                      {question.prompt}
                      {question.required ? " *" : ""}
                    </span>
                    <textarea
                      rows={3}
                      required={question.required}
                      value={answers[question.id] ?? ""}
                      onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                      disabled={busy}
                    />
                  </label>
                ))}
                <label>
                  <span>Note (optional)</span>
                  <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} />
                </label>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
      {selectedRole && submitState && view === "role" ? (
        <div className="opportunities-detail__footer">
          {actionError ? (
            <p role="alert">
              {actionError}{" "}
              {upgrade ? <Link href="/settings?section=resources">Upgrade</Link> : null}
            </p>
          ) : null}
          <FooterActions
            state={submitState.kind}
            externalUrl={casting?.externalSubmissionURL ?? null}
            confirming={confirming}
            busy={busy}
            canConfirm={!requiredMissing}
            canPass={!submission}
            invited={invited}
            onSubmit={() => setConfirming(true)}
            onConfirm={() => void submit()}
            onCancel={() => setConfirming(false)}
            onPass={() => void passOrDecline()}
          />
        </div>
      ) : null}
    </WorkspaceSidePanel>
  );
}

function ProjectView({
  detail,
  onOpenRole,
}: {
  detail: TalentCastingDetail;
  onOpenRole: (role: PublicCastingRole) => void;
}) {
  const { casting } = detail;
  const compensation =
    (casting.compensationBreakdown?.length ? casting.compensationBreakdown : null) ??
    (casting.compensationSummary?.trim() ? [{ label: "Details", value: casting.compensationSummary.trim() }] : []);
  const notes = casting.additionalNotes?.trim() || casting.usageNotes?.trim() || null;
  const deadline = formatCastingDeadline(casting.deadline);
  const ribbon = projectRibbon(detail);

  return (
    <div className="opportunities-detail__stack">
      {casting.coverImageURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="opportunities-cover" src={casting.coverImageURL} alt="" />
      ) : null}
      <div className="opportunities-stats">
        {casting.production ? <span>{casting.production}</span> : null}
        {casting.compensationSummary ? <span>{casting.compensationSummary}</span> : null}
        {casting.location ? <span>{casting.location}</span> : null}
      </div>
      {ribbon ? <p className="opportunities-outcome" data-outcome={ribbon.outcome}>{ribbon.label}</p> : null}
      {casting.organizerName?.trim() ? (
        <OrganizerRow name={casting.organizerName.trim()} headshotURL={casting.organizerHeadshotURL ?? null} />
      ) : null}
      {casting.description?.trim() ? (
        <section className="casting-glass-card">
          <h2 className="casting-section-title">About</h2>
          <p className="casting-body-copy">{casting.description.trim()}</p>
        </section>
      ) : null}
      <section className="casting-glass-card">
        <h2 className="casting-section-title">{casting.roles.length === 1 ? "1 role" : `${casting.roles.length} roles`}</h2>
        <ul className="opportunities-roles">
          {casting.roles.map((role, index) => {
            const submission = detail.submissionsByRoleId[role.id];
            return (
              <li key={role.id}>
                <button type="button" onClick={() => onOpenRole(role)}>
                  <span>{index + 1}</span>
                  <strong>{role.title}</strong>
                  <em>{submission ? outcomeLabel(submission.outcome) : detail.inviteByRoleId[role.id] ? "Invited" : "View"}</em>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      {casting.schedule?.length ? <ScheduleSection schedule={casting.schedule} /> : null}
      {compensation.length ? <CompensationSection lines={compensation} /> : null}
      {deadline ? (
        <section className="casting-glass-card">
          <h2 className="casting-section-title">Submission info</h2>
          <p className="casting-body-copy">Deadline · {deadline}</p>
        </section>
      ) : null}
      {notes ? (
        <section className="casting-glass-card">
          <h2 className="casting-section-title">Additional notes</h2>
          <p className="casting-body-copy">{notes}</p>
        </section>
      ) : null}
    </div>
  );
}

function FooterActions({
  state,
  externalUrl,
  confirming,
  busy,
  canConfirm,
  canPass,
  invited,
  onSubmit,
  onConfirm,
  onCancel,
  onPass,
}: {
  state: ReturnType<typeof roleSubmitState>["kind"];
  externalUrl: string | null;
  confirming: boolean;
  busy: boolean;
  canConfirm: boolean;
  canPass: boolean;
  invited: boolean;
  onSubmit: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onPass: () => void;
}) {
  if (state === "submitted") {
    return <button type="button" className="opportunities-action" disabled>Submitted</button>;
  }
  if (state === "closed") {
    return <button type="button" className="opportunities-action" disabled>Casting closed</button>;
  }
  if (state === "external" && externalUrl) {
    return (
      <a className="opportunities-action" href={externalUrl} target="_blank" rel="noopener noreferrer">
        Apply on external site
      </a>
    );
  }
  if (state === "invite_only") return <p className="opportunities-lock">This casting is invite-only.</p>;
  if (state === "agency_only") return <p className="opportunities-lock">Agency representation is required for this casting.</p>;
  if (state === "roster_only") return <p className="opportunities-lock">Only dancers on the selected roster can submit.</p>;
  if (confirming) {
    return (
      <div className="opportunities-detail__actions">
        <button type="button" className="opportunities-action" disabled={busy || !canConfirm} onClick={onConfirm}>
          {busy ? "Submitting…" : "Confirm submit"}
        </button>
        <button type="button" className="opportunities-action opportunities-action--quiet" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }
  return (
    <div className="opportunities-detail__actions">
      <button type="button" className="opportunities-action" disabled={busy} onClick={onSubmit}>
        Submit
      </button>
      {canPass ? (
        <button type="button" className="opportunities-action opportunities-action--quiet" disabled={busy} onClick={onPass}>
          {invited ? "Decline" : "Pass"}
        </button>
      ) : null}
    </div>
  );
}

function projectRibbon(detail: TalentCastingDetail) {
  const submissions = Object.values(detail.submissionsByRoleId);
  if (!submissions.length) return null;
  const selected = submissions.find((row) => row.outcome === "selected");
  if (selected) return { outcome: selected.outcome, label: "Selected" };
  const closed = submissions.every((row) => row.outcome === "not_selected" || row.outcome === "casting_closed");
  if (closed && submissions[0]) return { outcome: submissions[0].outcome, label: outcomeLabel(submissions[0].outcome) };
  return { outcome: "submitted" as const, label: "Submitted" };
}

function submittedOn(iso: string) {
  return `Submitted ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}
