"use client";

import { Bell, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { NotificationAvatar, useNotificationActors } from "@/components/workspace/NotificationAvatar";
import { useBuyerNotifications } from "@/hooks/use-buyer-notifications";
import { castingNotificationHref } from "@/lib/app/talent-casting-state";
import { dealMemoNotificationHref } from "@/lib/booking/deal-memo-routes";
import { formatBuyerRelativeDate } from "@/lib/talent-buyers/dashboard-data";

const PANEL_ID = "workspace-notifications-panel";

type NotificationsState = ReturnType<typeof useBuyerNotifications> & {
  viewerId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const NotificationsContext = createContext<NotificationsState | null>(null);

function useWorkspaceNotifications() {
  const value = useContext(NotificationsContext);
  if (!value) throw new Error("Notifications controls must render inside the talent workspace.");
  return value;
}

export function WorkspaceNotificationsProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const notifications = useBuyerNotifications(userId, { limit: 30 });
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = useCallback((next: boolean) => setOpenPath(next ? pathname : null), [pathname]);
  const value = { ...notifications, viewerId: userId, open, setOpen };
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsPanel() {
  const { open, setOpen } = useWorkspaceNotifications();
  return { open, setOpen };
}

export function useWorkspaceViewerId() {
  return useWorkspaceNotifications().viewerId;
}

export function NotificationsButton() {
  const { open, setOpen, unreadCount } = useWorkspaceNotifications();
  return (
    <button
      type="button"
      className="workspace-notifications-button"
      aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
      aria-expanded={open}
      aria-controls={PANEL_ID}
      onClick={() => setOpen(!open)}
    >
      <Bell size={18} strokeWidth={1.8} aria-hidden />
      {unreadCount ? <span aria-hidden>{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
    </button>
  );
}

export function NotificationsPanel() {
  const { open, setOpen, notifications, unreadCount, isLoading, error, markAllRead, markRead, loadNotifications } =
    useWorkspaceNotifications();
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [saving, setSaving] = useState(false);
  const actors = useNotificationActors(notifications);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <aside
      id={PANEL_ID}
      className="workspace-frame workspace-notifications-frame"
      aria-label="Notifications"
      data-open={open}
      inert={!open}
    >
      <div className="workspace-notifications">
        <header className="workspace-notifications__header">
          <h2>Notifications</h2>
          <div>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="workspace-notifications__mark"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await markAllRead();
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Updating…" : "Mark all read"}
              </button>
            ) : null}
            <button
              ref={closeRef}
              type="button"
              className="workspace-notifications__close"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </header>
        <div className="workspace-notifications__body">
          {error ? (
            <p role="alert" className="workspace-notifications__notice">
              {error}{" "}
              <button type="button" onClick={() => void loadNotifications()}>
                Try again
              </button>
            </p>
          ) : null}
          {isLoading ? (
            <p className="workspace-notifications__notice">Loading…</p>
          ) : !notifications.length && !error ? (
            <div className="workspace-notifications__empty">
              <Bell size={24} strokeWidth={1.5} aria-hidden />
              <p>A little quiet, for now</p>
              <span>New invitations and activity updates will appear here.</span>
            </div>
          ) : (
            <ul>
              {notifications.map((row) => {
                const href = dealMemoNotificationHref(row) ?? castingNotificationHref(row);
                const title = row.title ?? row.type.replace(/_/g, " ");
                const copy = (
                  <>
                    <NotificationAvatar data={row.data} actors={actors} fallback={title} />
                    <div className="workspace-notifications__copy">
                      <p>{title}</p>
                      {row.body ? <p>{row.body}</p> : null}
                      <time dateTime={row.created_at}>{formatBuyerRelativeDate(row.created_at)}</time>
                    </div>
                  </>
                );
                return (
                  <li key={row.id} data-unread={!row.read_at}>
                    {href ? (
                      <button
                        type="button"
                        className="workspace-notifications__link"
                        onClick={() => {
                          if (!row.read_at) void markRead(row.id);
                          setOpen(false);
                          router.push(href);
                        }}
                      >
                        {copy}
                      </button>
                    ) : (
                      copy
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
