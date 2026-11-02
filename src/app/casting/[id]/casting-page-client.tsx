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
import { CastingApplicationModal } from "@/components/casting/CastingApplicationModal";
import { formatCastingDeadline } from "@/lib/publicCasting";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import type { PublicCasting } from "@/types/public";



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
  const [submitOpen, setSubmitOpen] = useState(searchParams.get("apply") === "1");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const isSubmitting = false;
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

      {submitOpen && selectedRole ? (
        <CastingApplicationModal projectId={casting.id} roleId={selectedRole.id} roleTitle={selectedRole.title}
          onClose={() => setSubmitOpen(false)}
          onComplete={() => { setSubmitSuccess(true); setSubmitOpen(false); }} />
      ) : null}
    </CastingPublicShell>
  );
}
