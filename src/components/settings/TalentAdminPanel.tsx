"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  previewAdminAnnouncement,
  reviewTalentProfile,
  sendAdminAnnouncement,
  type AnnouncementAudience,
  type ProfileReviewItem,
} from "@/app/settings/work-actions";
import type { KpiMetric } from "@/lib/analytics/kpi-types";

const audiences: { id: AnnouncementAudience; label: string }[] = [
  { id: "all", label: "Everyone on Motiion" },
  { id: "talent", label: "Talent only" },
  { id: "community", label: "Community members only" },
  { id: "industry", label: "Industry professionals only" },
];

function formatMetric(metric: KpiMetric) {
  if (metric.format === "currency") {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(metric.current);
  }
  if (metric.format === "percent") return `${metric.current}%`;
  return new Intl.NumberFormat().format(metric.current);
}

export function TalentAdminPanel({
  metrics,
  reviews,
  reviewError,
}: {
  metrics: KpiMetric[];
  reviews: ProfileReviewItem[];
  reviewError: string | null;
}) {
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [body, setBody] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [queue, setQueue] = useState(reviews);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function preview() {
    setError(null);
    startTransition(async () => {
      const result = await previewAdminAnnouncement(audience);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCount(result.count);
    });
  }

  function send() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await sendAdminAnnouncement({ body, audience });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      setMessage("Announcement sent.");
    });
  }

  function review(userId: string, action: "approve" | "decline") {
    setError(null);
    startTransition(async () => {
      const result = await reviewTalentProfile({
        userId,
        action,
        feedback: action === "decline" ? feedback : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setQueue((current) => current.filter((item) => item.userId !== userId));
      setDeclineId(null);
      setFeedback("");
    });
  }

  return (
    <div className="talent-settings-stack">
      <section className="talent-settings-card">
        <h2>Admin chat</h2>
        <p>Send a Motiion announcement to the same audiences as the app.</p>
        <label>
          Audience
          <select value={audience} onChange={(event) => setAudience(event.target.value as AnnouncementAudience)}>
            {audiences.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Message
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} />
        </label>
        <div className="talent-settings-actions">
          <button type="button" className="talent-settings-secondary" disabled={pending} onClick={preview}>
            {count === null ? "Preview audience" : `${count} people`}
          </button>
          <button type="button" className="talent-settings-primary" disabled={pending || !body.trim()} onClick={send}>
            Send
          </button>
        </div>
      </section>

      <section className="talent-settings-card">
        <div className="talent-settings-row">
          <div>
            <h2>Analytics</h2>
            <p>The same KPI snapshot used by admin analytics.</p>
          </div>
          <Link className="talent-settings-secondary" href="/admin/analytics">
            Open full analytics
          </Link>
        </div>
        {metrics.length ? (
          <ul className="talent-settings-metrics">
            {metrics.slice(0, 8).map((metric) => (
              <li key={metric.key}>
                <span>{metric.label}</span>
                <strong>{formatMetric(metric)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>Analytics isn’t available from this environment yet.</p>
        )}
      </section>

      <section className="talent-settings-card">
        <h2>Profiles to review</h2>
        {reviewError ? <p className="talent-settings-error">{reviewError}</p> : null}
        {queue.length ? (
          <ul className="talent-settings-list">
            {queue.map((item) => (
              <li key={item.userId}>
                <div>
                  <strong>{item.displayName}</strong>
                  <p>{item.username ? `@${item.username}` : "No username"}</p>
                  {declineId === item.userId ? (
                    <label>
                      Feedback
                      <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={3} />
                    </label>
                  ) : null}
                </div>
                <div className="talent-settings-actions">
                  <button type="button" className="talent-settings-secondary" disabled={pending} onClick={() => review(item.userId, "approve")}>
                    Approve
                  </button>
                  {declineId === item.userId ? (
                    <button type="button" className="talent-settings-secondary" disabled={pending} onClick={() => review(item.userId, "decline")}>
                      Send decline
                    </button>
                  ) : (
                    <button type="button" className="talent-settings-secondary" onClick={() => setDeclineId(item.userId)}>
                      Decline
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No talent profiles are waiting for review.</p>
        )}
      </section>

      {error ? <p className="talent-settings-error">{error}</p> : null}
      {message ? <p className="talent-settings-success">{message}</p> : null}
    </div>
  );
}
