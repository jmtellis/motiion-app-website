import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { formatActivitySchedule } from "@/lib/app/home";
import type { HomeFeedData } from "@/types/app";

function requestKindLabel(kind: string) {
  return kind.replace(/_/g, " ");
}

function todayLabel() {
  return new Date()
    .toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
}

export function HomeFeed({
  greeting,
  feed,
  invitationsSlot,
}: {
  greeting: string;
  feed: HomeFeedData;
  invitationsSlot?: ReactNode;
}) {
  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#262626] pb-6">
        <div className="space-y-1.5">
          <p className="font-mono text-xs font-medium tracking-[0.08em] text-[#5a5a5a] uppercase">
            {todayLabel()}
          </p>
          <h1 className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.02em] text-[#fafafa]">
            {greeting}
          </h1>
        </div>
        <p className="font-mono text-xs tracking-[0.08em] text-[#5a5a5a] uppercase">
          {feed.matchedOpportunities.length} matched · {feed.pendingRequests.length} pending ·{" "}
          {feed.upcomingActivities.length} upcoming
        </p>
      </header>

      <section className="space-y-4">
        <SectionHeader
          label="Matched for you"
          count={feed.matchedOpportunities.length}
          empty="No opportunities yet. Finish your profile and we'll start matching."
        />
        {feed.matchedOpportunities.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {feed.matchedOpportunities.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Link
                  href={item.href}
                  className="group flex h-full flex-col rounded-[14px] border border-[#262626] bg-[#151515] p-5 transition-colors hover:border-[#3a3a3a] hover:bg-[#1e1e1e]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-medium tracking-[0.08em] text-[#8a8a8a] uppercase">
                      {item.kind}
                    </span>
                    <span className="rounded-full bg-[#0c2a26] px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-[0.08em] text-[#2dd4bf] uppercase">
                      Match {item.score}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-medium leading-snug tracking-[-0.01em] text-[#fafafa]">
                    {item.title}
                  </h3>
                  {item.subtitle ? (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#a3a3a3]">{item.subtitle}</p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <span className="truncate font-mono text-xs text-[#5a5a5a]">
                      {item.location ?? "Location TBD"}
                    </span>
                    <ArrowUpRight
                      className="size-4 shrink-0 text-[#5a5a5a] transition-colors group-hover:text-[#fafafa]"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {invitationsSlot}

      <section className="space-y-4">
        <SectionHeader
          label="Pending requests"
          count={feed.pendingRequests.length}
          empty="You're caught up — no invites or actions waiting."
        />
        {feed.pendingRequests.length ? (
          <div className="overflow-hidden rounded-[14px] border border-[#262626] bg-[#151515]">
            <ul className="divide-y divide-[#262626]">
              {feed.pendingRequests.map((item) => (
                <li key={`${item.request_kind}-${item.id}`} className="flex gap-4 px-5 py-4">
                  <RequestCover url={item.cover_url} title={item.title} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-medium text-[#fafafa]">{item.title}</h3>
                      <span className="rounded-full border border-[#262626] bg-[#1e1e1e] px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.08em] text-[#8a8a8a] uppercase">
                        {requestKindLabel(item.request_kind)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#a3a3a3]">{item.header_text}</p>
                    {item.detail_text ? (
                      <p className="mt-0.5 text-sm text-[#a3a3a3]">{item.detail_text}</p>
                    ) : null}
                    <p className="mt-1.5 font-mono text-xs text-[#5a5a5a]">From {item.inviter_name}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <SectionHeader
          label="Upcoming"
          count={feed.upcomingActivities.length}
          empty="No upcoming classes, sessions, or events on your calendar yet."
        />
        {feed.upcomingActivities.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {feed.upcomingActivities.map((item) => (
              <li key={`${item.role}-${item.id}`}>
                <Link
                  href={`/activity/${item.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-[#262626] bg-[#151515] transition-colors hover:border-[#3a3a3a]"
                >
                  <div className="relative h-36 w-full bg-[#1e1e1e]">
                    {item.cover_image_url ? (
                      <Image src={item.cover_image_url} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center font-mono text-xs tracking-[0.08em] text-[#5a5a5a] uppercase">
                        {item.type ?? "Activity"}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <span className="font-mono text-[11px] font-medium tracking-[0.08em] text-[#8a8a8a] uppercase">
                      {item.role === "hosting" ? "Hosting" : "Attending"}
                      {item.type ? ` · ${item.type}` : ""}
                    </span>
                    <h3 className="mt-1.5 text-base font-medium leading-snug text-[#fafafa]">{item.title}</h3>
                    <p className="mt-auto pt-3 font-mono text-xs text-[#5a5a5a]">
                      {formatActivitySchedule(item)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function SectionHeader({
  label,
  count,
  empty,
}: {
  label: string;
  count: number;
  empty: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="font-mono text-xs font-medium tracking-[0.08em] text-[#8a8a8a] uppercase">
        {label}
        {count ? <span className="ml-2 text-[#5a5a5a]">{count}</span> : null}
      </h2>
      {!count ? <p className="text-sm text-[#5a5a5a]">{empty}</p> : null}
    </div>
  );
}

function RequestCover({ url, title }: { url: string | null; title: string }) {
  if (!url) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-[8px] border border-[#262626] bg-[#1e1e1e] font-mono text-xs font-medium text-[#8a8a8a]">
        {title.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="relative size-14 shrink-0 overflow-hidden rounded-[8px] border border-[#262626] bg-[#1e1e1e]">
      <Image src={url} alt="" fill className="object-cover" unoptimized />
    </div>
  );
}
