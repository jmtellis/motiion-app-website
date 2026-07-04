"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PublicReviewShell } from "@/components/public/PublicReviewShell";
import { ShortlistProfileCardStack } from "@/components/shortlist/ShortlistProfileCardStack";
import { ShortlistProfileModal } from "@/components/shortlist/ShortlistProfileModal";
import { ShortlistReviewChrome } from "@/components/shortlist/ShortlistReviewChrome";
import {
  fetchPublicShortlist,
  PublicShortlistError,
  submitShortlistVotes,
} from "@/lib/publicShortlist";
import { trackClientEvent } from "@/lib/analytics/track-client";
import type {
  PublicShortlistPayload,
  PublicShortlistSubmission,
  PublicShortlistVote,
} from "@/types/publicShortlist";

import "@/app/shortlist/shortlist.css";
import "@/app/casting/casting.css";

type UndoEntry = {
  submission: PublicShortlistSubmission;
  vote: PublicShortlistVote;
};

export default function ShortlistReviewClient({ token: rawToken }: { token: string }) {
  const token = decodeURIComponent(rawToken).trim();

  const [payload, setPayload] = useState<PublicShortlistPayload | null>(null);
  const [pendingSubmissions, setPendingSubmissions] = useState<PublicShortlistSubmission[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [votes, setVotes] = useState<Record<string, PublicShortlistVote>>({});
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [previewSubmission, setPreviewSubmission] = useState<PublicShortlistSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [didSubmit, setDidSubmit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      setIsExpired(false);

      try {
        const data = await fetchPublicShortlist(token);
        if (cancelled) return;
        setPayload(data);
        setPendingSubmissions(data.submissions);
        setSelectedRecipientId(data.recipients[0]?.id ?? "");
      } catch (err) {
        if (cancelled) return;
        if (err instanceof PublicShortlistError && err.status === 410) {
          setIsExpired(true);
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load shortlist.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!payload) {
      return;
    }

    trackClientEvent(
      "shortlist_viewed",
      {
        project_title: payload.share.projectTitle,
        role_title: payload.share.roleTitle,
      },
      `/shortlist/${encodeURIComponent(token)}`,
    );
  }, [payload, token]);

  const confirmCount = useMemo(
    () => Object.values(votes).filter((vote) => vote === "yes").length,
    [votes],
  );
  const rejectCount = useMemo(
    () => Object.values(votes).filter((vote) => vote === "no").length,
    [votes],
  );

  const canSubmit =
    Boolean(selectedRecipientId) &&
    pendingSubmissions.length === 0 &&
    Object.keys(votes).length > 0 &&
    !isSubmitting;

  const recordVote = useCallback((submission: PublicShortlistSubmission, vote: PublicShortlistVote) => {
    setVotes((current) => ({ ...current, [submission.id]: vote }));
    setUndoStack((current) => [...current, { submission, vote }]);
    setPendingSubmissions((current) => current.filter((item) => item.id !== submission.id));
  }, []);

  const chooseTopCard = useCallback(
    (vote: PublicShortlistVote) => {
      const top = pendingSubmissions[0];
      if (!top) return;
      recordVote(top, vote);
    },
    [pendingSubmissions, recordVote],
  );

  const undoLastVote = useCallback(() => {
    setUndoStack((current) => {
      const last = current[current.length - 1];
      if (!last) return current;

      setVotes((votesCurrent) => {
        const next = { ...votesCurrent };
        delete next[last.submission.id];
        return next;
      });
      setPendingSubmissions((pending) => [last.submission, ...pending]);

      return current.slice(0, -1);
    });
  }, []);

  async function submitVotes() {
    if (!payload || !canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitShortlistVotes({
        token,
        recipientId: selectedRecipientId,
        votes: Object.entries(votes).map(([submissionId, vote]) => ({ submissionId, vote })),
      });
      trackClientEvent(
        "shortlist_submitted",
        {
          vote_count: Object.keys(votes).length,
          confirm_count: confirmCount,
          reject_count: rejectCount,
        },
        `/shortlist/${encodeURIComponent(token)}`,
      );
      setDidSubmit(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit votes.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <PublicReviewShell>
        <p className="public-review-status">Loading shortlist...</p>
      </PublicReviewShell>
    );
  }

  if (isExpired) {
    return (
      <PublicReviewShell>
        <section className="public-review-glass-card shortlist-complete-card">
          <h1 className="public-review-page-title">Link expired</h1>
          <p className="public-review-body">
            This shortlist link has expired. Ask the choreographer to send a new one.
          </p>
        </section>
      </PublicReviewShell>
    );
  }

  if (error && !payload) {
    return (
      <PublicReviewShell>
        <section className="public-review-glass-card shortlist-complete-card">
          <h1 className="public-review-page-title">Shortlist unavailable</h1>
          <p className="public-review-body">{error}</p>
        </section>
      </PublicReviewShell>
    );
  }

  if (!payload) {
    return (
      <PublicReviewShell>
        <p className="public-review-status">Shortlist not found.</p>
      </PublicReviewShell>
    );
  }

  if (didSubmit) {
    return (
      <PublicReviewShell>
        <section className="public-review-glass-card shortlist-complete-card">
          <p className="public-review-eyebrow">{payload.share.projectTitle}</p>
          <h1 className="public-review-page-title">Thanks for reviewing</h1>
          <p className="public-review-body">
            Your responses for {payload.share.roleTitle} were sent to the choreographer.
          </p>
        </section>
      </PublicReviewShell>
    );
  }

  if (payload.submissions.length === 0) {
    return (
      <PublicReviewShell>
        <ShortlistReviewChrome
          projectTitle={payload.share.projectTitle}
          roleTitle={payload.share.roleTitle}
          message={payload.share.message}
          recipients={payload.recipients}
          selectedRecipientId={selectedRecipientId}
          onRecipientChange={setSelectedRecipientId}
          remainingCount={0}
          totalCount={0}
          confirmCount={0}
          rejectCount={0}
          canUndo={false}
          onUndo={undoLastVote}
          onConfirm={() => chooseTopCard("yes")}
          onReject={() => chooseTopCard("no")}
          disableActions
        />
        <section className="public-review-glass-card shortlist-complete-card">
          <p className="public-review-body">This shortlist does not have any profiles yet.</p>
        </section>
      </PublicReviewShell>
    );
  }

  const deckComplete = pendingSubmissions.length === 0;

  return (
    <PublicReviewShell>
      <div className="shortlist-page" style={{ paddingBottom: deckComplete ? 88 : 24 }}>
        <ShortlistReviewChrome
          projectTitle={payload.share.projectTitle}
          roleTitle={payload.share.roleTitle}
          message={payload.share.message}
          recipients={payload.recipients}
          selectedRecipientId={selectedRecipientId}
          onRecipientChange={setSelectedRecipientId}
          remainingCount={pendingSubmissions.length}
          totalCount={payload.submissions.length}
          confirmCount={confirmCount}
          rejectCount={rejectCount}
          canUndo={undoStack.length > 0}
          onUndo={undoLastVote}
          onConfirm={() => chooseTopCard("yes")}
          onReject={() => chooseTopCard("no")}
          disableActions={isSubmitting}
        />

        {deckComplete ? (
          <section className="public-review-glass-card shortlist-complete-card">
            <h2 className="public-review-page-title">All profiles reviewed</h2>
            <p className="public-review-body">
              {confirmCount} confirm · {rejectCount} reject. Submit when you are ready.
            </p>
          </section>
        ) : (
          <ShortlistProfileCardStack
            submissions={pendingSubmissions}
            onSwipeLeft={(submission) => recordVote(submission, "no")}
            onSwipeRight={(submission) => recordVote(submission, "yes")}
            onPortraitTap={setPreviewSubmission}
          />
        )}

        {error ? <p className="public-review-error">{error}</p> : null}
      </div>

      {deckComplete ? (
        <div className="public-review-submit-bar">
          <button
            type="button"
            className="public-review-submit-button"
            disabled={!canSubmit}
            onClick={submitVotes}
          >
            {isSubmitting ? "Submitting..." : "Submit responses"}
          </button>
        </div>
      ) : null}

      {previewSubmission ? (
        <ShortlistProfileModal
          submission={previewSubmission}
          onClose={() => setPreviewSubmission(null)}
        />
      ) : null}
    </PublicReviewShell>
  );
}
