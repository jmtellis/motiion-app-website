"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { IndustryPageHeader, IndustryEmptyState } from "./IndustryUI";

import { BuyerEmptyIntro } from "@/components/talent-buyers/dashboard/BuyerEmptyIntro";
import { useBuyerNotifications } from "@/hooks/use-buyer-notifications";
import { formatBuyerRelativeDate } from "@/lib/talent-buyers/dashboard-data";

import "./notifications-page.css";

function GhostNotificationRow() {
  return (
    <div className="buyer-notifications-empty__row" aria-hidden>
      <span className="buyer-empty__bone buyer-notifications-empty__dot" />
      <div className="buyer-notifications-empty__copy">
        <span className="buyer-empty__bone buyer-empty__bone--title" />
        <span className="buyer-empty__bone buyer-empty__bone--line-mid" />
        <span className="buyer-empty__bone buyer-notifications-empty__time" />
      </div>
    </div>
  );
}

export function NotificationsPageView({ userId }: { userId: string }) {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAllRead,
    error,
    loadNotifications,
  } = useBuyerNotifications(userId, {
    limit: 50,
  });
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const visible = unreadOnly
    ? notifications.filter((row) => !row.read_at)
    : notifications;
  if (isLoading) {
    return (
      <div className="buyer-empty" aria-busy="true">
        <BuyerEmptyIntro title="Notifications" />
        <div className="buyer-notifications-empty__list" aria-hidden>
          {Array.from({ length: 6 }, (_, index) => (
            <GhostNotificationRow key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-notifications">
      <IndustryPageHeader
        eyebrow="Keep up with your work"
        title="Notifications"
        description="Updates across your projects, gathered in one place."
        actions={
          unreadCount > 0 && (
            <button
              disabled={saving}
              className="bd-btn-secondary"
              onClick={async () => {
                setSaving(true);
                try {
                  await markAllRead();
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Updating…" : "Mark shown as read"}
            </button>
          )
        }
      />
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            className="bd-btn-secondary"
            onClick={() => void loadNotifications()}
          >
            Try again
          </button>
        </p>
      )}
      <div className="industry-notification-tools">
        <div className="industry-layout-switch">
          <button
            aria-pressed={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
          >
            All updates
          </button>
          <button aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>
            Unread ({unreadCount})
          </button>
        </div>
        <span className="industry-result-count">{visible.length} updates</span>
      </div>
      {!visible.length && !error && (
        <IndustryEmptyState
          icon={<Bell size={25} />}
          title={
            unreadOnly ? "You’re all caught up" : "A little quiet, for now"
          }
          description={
            unreadOnly
              ? "There are no unread updates in this view. Switch to all updates to revisit recent activity."
              : "Your project updates will appear here as the work moves forward."
          }
        />
      )}
      <ul className="buyer-notifications__list">
        {visible.map((row) => {
          const unread = !row.read_at;
          return (
            <li
              key={row.id}
              className={`buyer-notifications__item${unread ? " buyer-notifications__item--unread" : ""}`}
            >
              <span
                className={`buyer-notifications__dot${unread ? " buyer-notifications__dot--unread" : ""}`}
                aria-hidden
              />
              <div className="buyer-notifications__copy">
                <p className="buyer-notifications__title">
                  {row.title ?? row.type.replace(/_/g, " ")}
                </p>
                {row.body ? (
                  <p className="buyer-notifications__body">{row.body}</p>
                ) : null}
                <p className="buyer-notifications__time">
                  {formatBuyerRelativeDate(row.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
