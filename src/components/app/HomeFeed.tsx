import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { formatActivitySchedule } from "@/lib/app/home";
import type { HomeFeedData } from "@/types/app";

function requestKindLabel(kind: string) {
  return kind.replace(/_/g, " ");
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
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="type-eyebrow text-[#8a8a8a]">Home</p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">{greeting}</h1>
        <p className="max-w-2xl text-base leading-relaxed text-[var(--ink-soft)]">
          Your invites, upcoming schedule, and quick paths into Discover and Portfolio.
        </p>
      </header>

      <section className="space-y-4">
        <SectionTitle
          title="Matched for you"
          count={feed.matchedOpportunities.length}
          empty="No opportunities yet. Finish your profile and we'll start matching."
        />
        {feed.matchedOpportunities.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {feed.matchedOpportunities.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="ui-card-interactive p-4">
                <p className="type-eyebrow text-[#8a8a8a]">
                  {item.kind} · match {item.score}
                </p>
                <h2 className="mt-1 text-base font-semibold text-[var(--ink)]">{item.title}</h2>
                {item.subtitle ? <p className="mt-1 text-sm text-[var(--ink-soft)]">{item.subtitle}</p> : null}
                {item.location ? <p className="mt-1 text-xs text-[var(--ink-soft)]">{item.location}</p> : null}
                <Link
                  href={item.href}
                  className="mt-3 inline-flex text-sm font-medium text-[var(--accent-dark)] underline underline-offset-4"
                >
                  View opportunity
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {invitationsSlot}

      <section className="space-y-4">
        <SectionTitle
          title="Pending requests"
          count={feed.pendingRequests.length}
          empty="You’re caught up — no invites or actions waiting."
        />
        {feed.pendingRequests.length ? (
          <ul className="grid gap-3">
            {feed.pendingRequests.map((item) => (
              <li
                key={`${item.request_kind}-${item.id}`}
                className="ui-card flex gap-4 p-4"
              >
                <RequestCover url={item.cover_url} title={item.title} />
                <div className="min-w-0 flex-1">
                  <p className="type-eyebrow text-[#8a8a8a]">
                    {requestKindLabel(item.request_kind)}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-[var(--ink)]">{item.title}</h2>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">{item.header_text}</p>
                  {item.detail_text ? (
                    <p className="mt-1 text-sm text-[var(--ink-soft)]">{item.detail_text}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-[var(--ink-soft)]">From {item.inviter_name}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-4">
        <SectionTitle
          title="Upcoming"
          count={feed.upcomingActivities.length}
          empty="No upcoming classes, sessions, or events on your calendar yet."
        />
        {feed.upcomingActivities.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {feed.upcomingActivities.map((item) => (
              <li
                key={`${item.role}-${item.id}`}
                className="ui-card-interactive overflow-hidden"
              >
                {item.cover_image_url ? (
                  <div className="relative h-32 w-full bg-[var(--tone)]">
                    <Image
                      src={item.cover_image_url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : null}
                <div className="p-4">
                  <p className="type-eyebrow text-[#8a8a8a]">
                    {item.role === "hosting" ? "Hosting" : "Attending"}
                    {item.type ? ` · ${item.type}` : ""}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-[var(--ink)]">{item.title}</h2>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {formatActivitySchedule(item)}
                  </p>
                  <Link
                    href={`/activity/${item.id}`}
                    className="mt-3 inline-flex text-sm font-medium text-[var(--accent-dark)] underline underline-offset-4"
                  >
                    View activity
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <QuickLink href="/discover" title="Discover" description="Search talent, classes, and castings." />
        <QuickLink href="/inbox" title="Inbox" description="Messages and conversation threads." />
        <QuickLink href="/portfolio" title="Portfolio" description="Your public profile and credits." />
      </section>
    </div>
  );
}

function SectionTitle({
  title,
  count,
  empty,
}: {
  title: string;
  count: number;
  empty: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-xl font-semibold text-[var(--ink)]">{title}</h2>
      {count ? (
        <span className="text-sm text-[var(--ink-soft)]">{count}</span>
      ) : (
        <p className="text-sm text-[var(--ink-soft)]">{empty}</p>
      )}
    </div>
  );
}

function RequestCover({ url, title }: { url: string | null; title: string }) {
  if (!url) {
    return (
      <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-[var(--tone)] text-xs font-semibold text-[var(--ink-soft)]">
        {title.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[var(--tone)]">
      <Image src={url} alt="" fill className="object-cover" unoptimized />
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="ui-card-interactive p-4"
    >
      <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{description}</p>
    </Link>
  );
}
