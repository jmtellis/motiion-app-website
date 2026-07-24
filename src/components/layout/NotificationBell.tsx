"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

import { useBuyerNotifications } from "@/hooks/use-buyer-notifications";

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function NotificationBell({
  userId,
  className,
  align = "right",
}: {
  userId: string;
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllRead } = useBuyerNotifications(userId);

  useEffect(() => {
    if (!open) return;

    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggleOpen() {
    setOpen((current) => {
      const next = !current;
      if (next) void markAllRead();
      return next;
    });
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={unreadCount ? `Notifications (${unreadCount} unread)` : "Notifications"}
        aria-expanded={open}
        className="relative inline-flex size-9 items-center justify-center rounded-full text-[#8a8a8a] transition-colors hover:bg-[#1e1e1e] hover:text-[#eaeaea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <Bell className="size-[18px]" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-[var(--accent)] px-1 py-0.5 text-[10px] font-bold text-[#04231e]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`absolute z-50 mt-2 w-80 overflow-hidden rounded-[14px] border border-[#262626] bg-[#151515] ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          <div className="border-b border-[#262626] px-4 py-3">
            <p className="text-sm font-semibold text-[#fafafa]">Notifications</p>
          </div>
          {notifications.length ? (
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((row) => (
                <li key={row.id} className="border-b border-[#262626]/60 px-4 py-3 last:border-b-0">
                  <p className="text-sm font-medium text-[#eaeaea]">{row.title ?? row.type.replace(/_/g, " ")}</p>
                  {row.body ? <p className="mt-0.5 line-clamp-2 text-xs text-[#8a8a8a]">{row.body}</p> : null}
                  <p className="mt-1 font-mono text-[11px] text-[#5a5a5a]">{formatWhen(row.created_at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-[#8a8a8a]">You&apos;re all caught up.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
