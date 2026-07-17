"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import {
  castingStatusLabel,
  CASTING_STATUS_TONE_CLASSES,
  castingStatusTone,
} from "@/lib/talent-buyers/casting/casting-statuses";
import type { CastingCandidate, CastingEvaluation, CastingRecommendation } from "@/lib/talent-buyers/casting/casting-types";

import { SegmentedControl } from "@/components/talent-buyers/dashboard/SegmentedControl";

type DrawerTab = "profile" | "submission" | "evaluation" | "notes" | "history";

const DRAWER_TABS: { value: DrawerTab; label: string }[] = [
  { value: "profile", label: "Profile" },
  { value: "submission", label: "Submission" },
  { value: "evaluation", label: "Evaluation" },
  { value: "notes", label: "Notes" },
  { value: "history", label: "History" },
];

export function CastingCandidateDrawer({
  candidate,
  evaluations,
  currentUserId,
  onClose,
  onStatusChange,
  onSaveEvaluation,
}: {
  candidate: CastingCandidate;
  evaluations: CastingEvaluation[];
  currentUserId: string;
  onClose: () => void;
  onStatusChange: (status: CastingCandidate["status"], notify?: boolean) => void;
  onSaveEvaluation: (input: {
    recommendation?: CastingRecommendation;
    privateNotes?: string;
    scorecard?: Record<string, number | boolean | string>;
  }) => void;
}) {
  const [tab, setTab] = useState<DrawerTab>("profile");
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const myEval = evaluations.find((e) => e.evaluatorId === currentUserId);
  const [recommendation, setRecommendation] = useState<CastingRecommendation | "">(myEval?.recommendation ?? "");
  const [notes, setNotes] = useState(myEval?.privateNotes ?? "");

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="casting-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        ref={panelRef}
        className="casting-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${candidate.displayName} details`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="casting-drawer__header">
          <div>
            <h3>{candidate.displayName}</h3>
            <span className={`casting-status-pill ${CASTING_STATUS_TONE_CLASSES[castingStatusTone(candidate.status)]}`}>
              {castingStatusLabel(candidate.status)}
            </span>
          </div>
          <button ref={closeRef} type="button" className="casting-drawer__close" onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </button>
        </header>

        <SegmentedControl options={DRAWER_TABS} value={tab} onChange={setTab} ariaLabel="Candidate detail sections" />

        <div className="casting-drawer__body">
          {tab === "profile" ? (
            <div className="casting-drawer__profile">
              {candidate.headshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={candidate.headshotUrl}
                  alt=""
                  className="casting-candidate-card__photo casting-drawer__profile-photo"
                />
              ) : null}
              <dl className="casting-meta-grid">
                <div>
                  <dt>Source</dt>
                  <dd>{candidate.source}</dd>
                </div>
                {candidate.email ? (
                  <div>
                    <dt>Email</dt>
                    <dd>{candidate.email}</dd>
                  </div>
                ) : null}
                {candidate.agency ? (
                  <div>
                    <dt>Representation</dt>
                    <dd>{candidate.agency}</dd>
                  </div>
                ) : null}
              </dl>
              {candidate.talentSlug ? (
                <Link href={`/talent/${candidate.talentSlug}`} className="casting-role-card__link">
                  View Motiion profile
                </Link>
              ) : null}
            </div>
          ) : null}

          {tab === "submission" ? (
            <p className="casting-section__body">
              {candidate.submissionId ? "Submission materials attached." : "No formal submission on file."}
            </p>
          ) : null}

          {tab === "evaluation" ? (
            <form
              className="casting-form"
              onSubmit={(e) => {
                e.preventDefault();
                onSaveEvaluation({
                  recommendation: recommendation || undefined,
                  privateNotes: notes || undefined,
                });
              }}
            >
              <fieldset>
                <legend>Recommendation</legend>
                <div className="casting-radio-row">
                  {(["yes", "maybe", "no"] as const).map((value) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="recommendation"
                        value={value}
                        checked={recommendation === value}
                        onChange={() => setRecommendation(value)}
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                Private notes (internal only)
                <textarea className="casting-input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <button type="submit" className="bd-btn-accent">
                Save evaluation
              </button>
            </form>
          ) : null}

          {tab === "notes" ? (
            <p className="casting-section__body text-white/50">Internal notes are never sent to talent.</p>
          ) : null}

          {tab === "history" ? (
            <p className="casting-section__body">Updated {new Date(candidate.updatedAt).toLocaleString()}</p>
          ) : null}
        </div>

        <footer className="casting-drawer__footer">
          <button type="button" className="bd-btn-secondary text-sm" onClick={() => onStatusChange("shortlisted")}>
            Shortlist
          </button>
          <button type="button" className="bd-btn-secondary text-sm" onClick={() => onStatusChange("selected")}>
            Select
          </button>
          <button type="button" className="bd-btn-secondary text-sm" onClick={() => onStatusChange("not_moving_forward")}>
            Pass
          </button>
        </footer>
      </aside>
    </div>
  );
}
