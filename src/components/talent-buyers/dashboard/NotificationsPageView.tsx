"use client";

import { useEffect, useRef } from "react";

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

function NotificationsEmptyState() {
  return (
    <div className="buyer-empty">
      <BuyerEmptyIntro
        title="Notifications will show up here"
        lede="Casting updates, messages, and activity across your projects land in one place."
      />
      <div className="buyer-notifications-empty__list" aria-hidden>
        {Array.from({ length: 6 }, (_, index) => (
          <GhostNotificationRow key={index} />
        ))}
      </div>
    </div>
  );
}

export function NotificationsPageView({ userId }: { userId: string }) {
  const { notifications, unreadCount, isLoading, markAllRead } = useBuyerNotifications(userId, {
    limit: 50,
  });
  const didMarkRead = useRef(false);

  useEffect(() => {
    if (isLoading || didMarkRead.current || unreadCount === 0) return;
    didMarkRead.current = true;
    void markAllRead();
  }, [isLoading, unreadCount, markAllRead]);

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

  if (!notifications.length) {
    return <NotificationsEmptyState />;
  }

  return (
    <div className="buyer-notifications">
      <BuyerEmptyIntro
        title="Notifications"
        lede={
          unreadCount
            ? `${unreadCount} unread`
            : "You're all caught up."
        }
        primaryLabel={unreadCount ? "Mark all read" : undefined}
        primaryOnClick={unreadCount ? () => void markAllRead() : undefined}
      />

      <ul className="buyer-notifications__list">
        {notifications.map((row) => {
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
                {row.body ? <p className="buyer-notifications__body">{row.body}</p> : null}
                <p className="buyer-notifications__time">{formatBuyerRelativeDate(row.created_at)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
