"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveLaunchGoal,
  reviewTalent,
  setAnalyticsExclusion,
} from "@/app/admin/analytics/actions";
import { text, number, type Row } from "@/lib/admin-dashboard/model";
export function GoalEditor({
  metric,
  goal,
  disabled,
}: {
  metric: string;
  goal?: Row;
  disabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="launch-goal-form"
      action={(form) => {
        start(async () => {
          try {
            const result = await saveLaunchGoal(form);
            setError(result.error);
            if (!result.error) router.refresh();
          } catch {
            setError("Save failed. Try again.");
          }
        });
      }}
    >
      <input type="hidden" name="metric" value={metric} />
      <input type="hidden" name="version" value={number(goal?.version) ?? 0} />
      <label>
        Target
        <input
          name="target"
          type="number"
          min="0"
          step="any"
          required
          defaultValue={number(goal?.target) ?? ""}
          disabled={disabled || busy}
        />
      </label>
      <label>
        Owner
        <input
          name="owner"
          maxLength={200}
          required
          defaultValue={text(goal?.owner_name)}
          disabled={disabled || busy}
        />
      </label>
      <label>
        Deadline
        <input
          name="deadline"
          type="date"
          required
          defaultValue={text(goal?.deadline)}
          disabled={disabled || busy}
        />
      </label>
      <button className="launch-button" disabled={disabled || busy}>
        {busy ? "Saving…" : goal ? "Save & record progress" : "Set goal"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
export function TalentReview({
  userId,
  requestId,
  disabled,
}: {
  userId: string;
  requestId: string;
  disabled: boolean;
}) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();
  function submit(action: string) {
    start(async () => {
      try {
        const result = await reviewTalent(userId, requestId, action, feedback);
        setError(result.error);
        if (!result.error) router.refresh();
      } catch {
        setError("Review failed. Refresh and retry.");
      }
    });
  }
  return (
    <div className="launch-review-actions">
      <label>
        Feedback sent to dancer
        <textarea
          rows={3}
          maxLength={3000}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={busy || disabled}
        />
      </label>
      <div className="launch-inline">
        <button
          className="launch-button"
          onClick={() => submit("approve")}
          disabled={busy || disabled || !requestId}
        >
          Approve profile
        </button>
        <button
          className="launch-button secondary"
          onClick={() => submit("decline")}
          disabled={busy || disabled || !feedback.trim() || !requestId}
        >
          Send feedback & decline
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!requestId && (
        <p>
          Missing request record. Refresh or repair the submission before
          reviewing.
        </p>
      )}
    </div>
  );
}
export function ExclusionEditor({ disabled }: { disabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="launch-goal-form"
      action={(form) =>
        start(async () => {
          try {
            const r = await setAnalyticsExclusion(form);
            setError(r.error);
            if (!r.error) router.refresh();
          } catch {
            setError("Could not save exclusion.");
          }
        })
      }
    >
      <label>
        Account UUID
        <input name="userId" required disabled={disabled || busy} />
      </label>
      <label>
        Reason
        <input name="reason" maxLength={500} disabled={disabled || busy} />
      </label>
      <label>
        Action
        <select name="excluded" disabled={disabled || busy}>
          <option value="true">Exclude test account</option>
          <option value="false">Include account again</option>
        </select>
      </label>
      <button className="launch-button secondary" disabled={disabled || busy}>
        Save exclusion
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
