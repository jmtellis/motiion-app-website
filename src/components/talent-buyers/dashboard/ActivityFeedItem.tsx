import Link from "next/link";
import {
  CalendarPlus,
  FileText,
  Link2,
  Share2,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { formatBuyerRelativeDate } from "@/lib/talent-buyers/dashboard-data";
import type { BuyerActivityItem } from "@/types/talent-buyer-dashboard";

function activityMeta(type: BuyerActivityItem["type"]): { label: string; icon: LucideIcon } {
  switch (type) {
    case "talent_added_to_roster":
      return { label: "Roster", icon: UserPlus };
    case "project_shared":
      return { label: "Shared", icon: Share2 };
    case "event_created":
      return { label: "Event", icon: CalendarPlus };
    case "talent_profile_updated":
      return { label: "Profile", icon: UserPlus };
    case "note_added":
      return { label: "Note", icon: FileText };
    case "shortlist_shared":
      return { label: "Shortlist", icon: Link2 };
    default:
      return { label: "Update", icon: FileText };
  }
}

export function ActivityFeedItem({
  item,
  isLast = false,
  variant = "default",
}: {
  item: BuyerActivityItem;
  isLast?: boolean;
  variant?: "default" | "dashboard";
}) {
  const { label, icon: Icon } = activityMeta(item.type);
  const isDashboard = variant === "dashboard";
  const iconBadgeClass = isDashboard
    ? "relative z-[1] inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/4 text-white/70"
    : "relative z-[1] inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-chip)] border border-[color-mix(in_oklab,var(--accent),white_70%)] bg-[color-mix(in_oklab,var(--accent),white_92%)] text-[var(--accent-dark)]";
  const chipClass = isDashboard ? "bd-chip" : "ui-chip";

  const content = (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast ? (
        <span className={`absolute left-[17px] top-10 bottom-0 w-px ${isDashboard ? "bg-white/8" : "bg-[var(--line)]"}`} aria-hidden />
      ) : null}
      <span className={iconBadgeClass}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className={`min-w-0 flex-1 border-b px-1 pb-4 transition last:border-b-0 ${isDashboard ? "border-white/8" : "border-[var(--line)]"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-semibold ${isDashboard ? "text-white/92" : "text-[var(--ink)]"}`}>{item.title}</p>
          <span className={`${chipClass} px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase`}>
            {label}
          </span>
        </div>
        <p className={`mt-1 text-sm ${isDashboard ? "text-white/50" : "text-[var(--ink-soft)]"}`}>{item.description}</p>
        <p className={`mt-2 text-xs ${isDashboard ? "text-white/42" : "text-[var(--ink-soft)]"}`}>{formatBuyerRelativeDate(item.timestamp)}</p>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block transition hover:opacity-95">
        {content}
      </Link>
    );
  }

  return content;
}
