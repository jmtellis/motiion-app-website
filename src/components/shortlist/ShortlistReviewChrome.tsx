"use client";

import type { PublicShortlistRecipient } from "@/types/publicShortlist";

type ShortlistReviewChromeProps = {
  projectTitle: string;
  roleTitle: string;
  message: string | null;
  recipients: PublicShortlistRecipient[];
  selectedRecipientId: string;
  onRecipientChange: (recipientId: string) => void;
  remainingCount: number;
  totalCount: number;
  confirmCount: number;
  rejectCount: number;
  canUndo: boolean;
  onUndo: () => void;
  onConfirm: () => void;
  onReject: () => void;
  disableActions: boolean;
};

export function ShortlistReviewChrome({
  projectTitle,
  roleTitle,
  message,
  recipients,
  selectedRecipientId,
  onRecipientChange,
  remainingCount,
  totalCount,
  confirmCount,
  rejectCount,
  canUndo,
  onUndo,
  onConfirm,
  onReject,
  disableActions,
}: ShortlistReviewChromeProps) {
  const reviewedCount = totalCount - remainingCount;

  return (
    <section className="shortlist-page-header">
      <p className="public-review-eyebrow">{projectTitle}</p>
      <h1 className="public-review-page-title">{roleTitle}</h1>
      {message?.trim() ? <p className="public-review-body">{message.trim()}</p> : null}
      <p className="public-review-subtitle">
        Swipe right to confirm or left to reject. Review every profile, then submit your responses.
      </p>

      <div className="public-review-glass-card" style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 8 }}>
          <span className="public-review-section-title">Reviewing as</span>
          <select
            className="public-review-select"
            value={selectedRecipientId}
            onChange={(event) => onRecipientChange(event.target.value)}
          >
            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.displayName}
              </option>
            ))}
          </select>
        </label>

        <div className="shortlist-chrome-stats">
          <span>
            {reviewedCount} of {totalCount} reviewed
          </span>
          <span>{confirmCount} confirm</span>
          <span>{rejectCount} reject</span>
        </div>
      </div>

      <div className="shortlist-chrome-actions">
        <button
          type="button"
          className="shortlist-chrome-button"
          disabled={!canUndo || disableActions}
          onClick={onUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className="shortlist-chrome-button shortlist-chrome-button--reject"
          disabled={disableActions || remainingCount === 0}
          onClick={onReject}
        >
          Reject
        </button>
        <button
          type="button"
          className="shortlist-chrome-button shortlist-chrome-button--confirm"
          disabled={disableActions || remainingCount === 0}
          onClick={onConfirm}
        >
          Confirm
        </button>
      </div>
    </section>
  );
}
