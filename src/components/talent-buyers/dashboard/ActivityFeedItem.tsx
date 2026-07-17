import Link from "next/link";
import {
  ArrowUpRight,
  CalendarCheck,
  CalendarPlus,
  CircleCheck,
  FileText,
  Link2,
  Mail,
  Ruler,
  Share2,
  Star,
  UserPlus,
} from "lucide-react";

import { formatBuyerRelativeDate } from "@/lib/talent-buyers/dashboard-data";
import type { BuyerActivityItem } from "@/types/talent-buyer-dashboard";

const ACTIVITY_META: Record<
  BuyerActivityItem["type"],
  { label: string; icon: typeof UserPlus }
> = {
  talent_added_to_roster: { label: "Roster", icon: UserPlus },
  project_shared: { label: "Shared", icon: Share2 },
  event_created: { label: "Event", icon: CalendarPlus },
  talent_profile_updated: { label: "Profile", icon: UserPlus },
  note_added: { label: "Note", icon: FileText },
  shortlist_shared: { label: "Shortlist", icon: Link2 },
  submission_received: { label: "Submission", icon: FileText },
  submission_reviewed: { label: "Reviewed", icon: CircleCheck },
  invitation_response: { label: "Invite", icon: Mail },
  invite_sent: { label: "Invite", icon: Mail },
  size_sheet_requested: { label: "Sizing", icon: Ruler },
  size_sheet_responded: { label: "Sizing", icon: Ruler },
  availability_requested: { label: "Avail", icon: CalendarCheck },
  availability_responded: { label: "Avail", icon: CalendarCheck },
  talent_shortlisted: { label: "Shortlist", icon: Star },
  casting_closed: { label: "Casting", icon: CircleCheck },
  casting_published: { label: "Casting", icon: CircleCheck },
};

export function ActivityFeedItem({
  item,
  isLast = false,
  variant = "default",
}: {
  item: BuyerActivityItem;
  isLast?: boolean;
  variant?: "default" | "dashboard";
}) {
  const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.note_added;
  const Icon = meta.icon;
  const isDashboard = variant === "dashboard";

  const content = (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {!isLast ? (
        <span
          className={`absolute top-10 bottom-0 w-px ${isDashboard ? "bg-white/8" : "bg-[var(--line)]"}`}
          style={{ left: "17px" }}
          aria-hidden
        />
      ) : null}
      <span
        className={
          isDashboard
            ? "relative z-[1] inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/4 text-white/70"
            : "relative z-[1] inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-chip)] border border-[color-mix(in_oklab,var(--accent),white_70%)] bg-[color-mix(in_oklab,var(--accent),white_92%)] text-[var(--accent-dark)]"
        }
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div
        className={`min-w-0 flex-1 border-b px-1 pb-4 transition last:border-b-0 ${isDashboard ? "border-white/8 group-hover:border-white/14" : "border-[var(--line)]"}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-semibold ${isDashboard ? "text-white/92" : "text-[var(--ink)]"}`}>
            {item.title}
          </p>
          <span
            className={`${isDashboard ? "bd-chip" : "ui-chip"} px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase`}
          >
            {meta.label}
          </span>
        </div>
        <p className={`mt-1 text-sm ${isDashboard ? "text-white/50" : "text-[var(--ink-soft)]"}`}>
          {item.description}
        </p>
        <p className={`mt-2 text-xs ${isDashboard ? "text-white/42" : "text-[var(--ink-soft)]"}`}>
          {formatBuyerRelativeDate(item.timestamp)}
        </p>
      </div>
      {item.href ? (
        <ArrowUpRight
          className={`mt-1 size-4 shrink-0 opacity-0 transition group-hover:opacity-60 ${isDashboard ? "text-white/50" : "text-[var(--ink-soft)]"}`}
          aria-hidden
        />
      ) : null}
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="group block transition hover:opacity-95">
        {content}
      </Link>
    );
  }

  return content;
}
