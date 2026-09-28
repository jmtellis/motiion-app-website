"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { CastingPublicShell } from "@/components/casting/CastingPublicShell";
import {
  CompensationSection,
  OrganizerRow,
  RoleDetailPanel,
  ScheduleSection,
} from "@/components/casting/CastingSections";
import { OpenInAppBar } from "@/components/product/OpenInAppBar";
import { PublicPageAnalytics } from "@/components/analytics/PublicPageAnalytics";
import { submitToCastingRole } from "@/lib/casting/submit";
import { formatCastingDeadline } from "@/lib/publicCasting";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { PublicCasting } from "@/types/public";

const SITE_HOME = "https://www.motiion.app";

export default function CastingPageClient({ casting }: { casting: PublicCasting }) {
  const searchParams = useSearchParams();
  const roleFromQuery = searchParams.get("role");

  const initialRoleId = useMemo(() => {
    if (roleFromQuery && casting.roles.some((role) => role.id === roleFromQuery)) {
      return roleFromQuery;
    }
    if (casting.selectedRoleId && casting.roles.some((role) => role.id === casting.selectedRoleId)) {
      return casting.selectedRoleId;
    }
    return null;
  }, [casting.roles, casting.selectedRoleId, roleFromQuery]);

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(initialRoleId);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitNote, setSubmitNote] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClientSupabaseClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      setIsSignedIn(Boolean(data.user));
    });
  }, []);

  const selectedRole = casting.roles.find((role) => role.id === selectedRoleId) ?? null;
  const deadlineLine = formatCastingDeadline(casting.deadline);
  const showActionBar = Boolean(selectedRole && !casting.externalSubmissionURL);
  const canSubmit = Boolean(selectedRole?.eligibleForSubmission);
  const productionLine = casting.production?.trim();
  const compensationBreakdown = casting.compensationBreakdown ?? [];
  const schedule = casting.schedule ?? [];
  const additionalNotes = casting.additionalNotes?.trim() || casting.usageNotes?.trim() || null;
  const compensationLines =
    compensationBreakdown.length > 0
      ? compensationBreakdown
      : casting.compensationSummary?.trim()
        ? [{ label: "Details", value: casting.compensationSummary.trim() }]
        : [];

  const openInAppPath = useMemo(() => {
    const projectPath = `/casting/${encodeURIComponent(casting.id)}`;
    if (selectedRoleId) {
      return `${projectPath}?role=${encodeURIComponent(selectedRoleId)}`;
    }
    return projectPath;
  }, [casting.id, selectedRoleId]);

  async function handleSubmit() {
    if (!selectedRole?.id) return;
    setSubmitError(null);
    setIsSubmitting(true);
    const result = await submitToCastingRole({ roleId: selectedRole.id, note: submitNote });
    setIsSubmitting(false);
    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }
    setSubmitSuccess(true);
    setSubmitOpen(false);
  }

  return (
    <CastingPublicShell>
      <PublicPageAnalytics
        eventName="casting_viewed"
        properties={{ casting_id: casting.id, activity_type: "casting" }}
        path={`/casting/${casting.id}`}
      />
      <PublicPageAnalytics
        eventName="opportunity_viewed"
        properties={{ opportunity_id: casting.id, activity_type: "casting" }}
        path={`/casting/${casting.id}`}
      />
      <article className="casting-page" style={{ paddingBottom: showActionBar ? 88 : 24 }}>
        <header className="casting-page-header">
          <h1 className="casting-page-title">{casting.title}</h1>
          {productionLine ? (
            <p className="casting-page-subtitle">Casting for {productionLine}</p>
          ) : null}
        </header>

        <div className="casting-page-hero">
          {casting.coverImageURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={casting.coverImageURL} alt="" />
          ) : null}
          <div className="casting-page-hero-overlay" />
          <div className="casting-page-hero-meta">
            {deadlineLine ? <p className="casting-page-deadline">Deadline · {deadlineLine}</p> : null}
            {casting.location ? <p className="casting-page-location">{casting.location}</p> : null}
          </div>
        </div>

        {casting.organizerName?.trim() ? (
          <OrganizerRow
            name={casting.organizerName.trim()}
            headshotURL={casting.organizerHeadshotURL ?? null}
          />
        ) : null}

        {casting.roles.length > 0 ? (
          <div className="casting-role-tabs" role="tablist" aria-label="Casting roles">
            {casting.roles.map((role) => (
              <button
                key={role.id}
                type="button"
                role="tab"
                className="casting-role-tab"
                data-active={selectedRoleId === role.id}
                aria-selected={selectedRoleId === role.id}
                onClick={() => setSelectedRoleId(role.id)}
              >
                {role.title}
              </button>
            ))}
          </div>
        ) : null}

        {selectedRole ? (
          <RoleDetailPanel role={selectedRole} />
        ) : (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Select a role</h2>
            <p className="casting-body-copy">Choose a role above to view requirements and submit.</p>
            {casting.description?.trim() ? (
              <>
                <div className="casting-divider" />
                <h2 className="casting-section-title">About this casting</h2>
                <p className="casting-body-copy">{casting.description.trim()}</p>
              </>
            ) : null}
          </section>
        )}

        {compensationLines.length > 0 && selectedRole ? (
          <CompensationSection lines={compensationLines} />
        ) : null}

        {schedule.length > 0 && selectedRole ? (
          <ScheduleSection schedule={schedule} />
        ) : null}

        {additionalNotes && selectedRole ? (
          <section className="casting-glass-card">
            <h2 className="casting-section-title">Additional notes</h2>
            <p className="casting-body-copy">{additionalNotes}</p>
          </section>
        ) : null}

        {casting.externalSubmissionURL ? (
          <a
            href={casting.externalSubmissionURL}
            target="_blank"
            rel="noopener noreferrer"
            className="casting-btn-primary casting-external-link"
          >
            Apply on external site
          </a>
        ) : null}
      </article>

      <OpenInAppBar
        href={openInAppPath}
        label="Open in Motiion"
        hint="Download Motiion to submit and track casting opportunities."
      />

      {showActionBar ? (
        <div className="casting-submit-bar">
          {submitSuccess ? (
            <p className="casting-submit-success" role="status">
              Submission received.{" "}
              {isSignedIn ? (
                <Link href="/home" className="casting-submit-success-link">
                  View your submissions
                </Link>
              ) : null}
            </p>
          ) : (
            <button
              type="button"
              className="casting-submit-button"
              disabled={!canSubmit || isSubmitting}
              onClick={() => {
                if (!canSubmit || !selectedRole) return;
                if (!isSignedIn) {
                  setSubmitOpen(true);
                  return;
                }
                setSubmitOpen(true);
              }}
            >
              {canSubmit ? (isSubmitting ? "Submitting…" : "Submit") : "Casting closed"}
            </button>
          )}
        </div>
      ) : null}

      {submitOpen ? (
        <CastingSubmitModal
          isSignedIn={Boolean(isSignedIn)}
          note={submitNote}
          error={submitError}
          isSubmitting={isSubmitting}
          onNoteChange={setSubmitNote}
          onClose={() => {
            if (!isSubmitting) {
              setSubmitOpen(false);
              setSubmitError(null);
            }
          }}
          onSubmit={() => void handleSubmit()}
        />
      ) : null}
    </CastingPublicShell>
  );
}

function CastingSubmitModal({
  isSignedIn,
  note,
  error,
  isSubmitting,
  onNoteChange,
  onClose,
  onSubmit,
}: {
  isSignedIn: boolean;
  note: string;
  error: string | null;
  isSubmitting: boolean;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!isSignedIn) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="casting-signup-title"
        className="casting-modal-backdrop"
        onClick={onClose}
      >
        <div className="casting-modal-card" onClick={(event) => event.stopPropagation()}>
          <h2 id="casting-signup-title" className="casting-modal-title">
            Sign in to submit
          </h2>
          <p className="casting-body-copy">
            Create a Motiion account or sign in on the web to submit to this casting. You can also use the mobile app.
          </p>
          <div className="casting-modal-actions">
            <a href={`${SITE_HOME}/login`} className="casting-modal-primary">
              Sign in
            </a>
            <a href={`${SITE_HOME}#signup`} className="casting-modal-dismiss">
              Get the app
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="casting-submit-title"
      className="casting-modal-backdrop"
      onClick={onClose}
    >
      <div className="casting-modal-card" onClick={(event) => event.stopPropagation()}>
        <h2 id="casting-submit-title" className="casting-modal-title">
          Submit to casting
        </h2>
        <p className="casting-body-copy">Add an optional note for the casting team.</p>
        <label className="casting-submit-note-label">
          <span>Note (optional)</span>
          <textarea
            className="casting-submit-note"
            rows={4}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            disabled={isSubmitting}
          />
        </label>
        {error ? (
          <p className="casting-submit-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="casting-modal-actions">
          <button type="button" className="casting-modal-primary" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Confirm submit"}
          </button>
          <button type="button" onClick={onClose} className="casting-modal-dismiss" disabled={isSubmitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
