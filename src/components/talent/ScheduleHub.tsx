import Link from "next/link";

import { EmptyState } from "@/components/talent/EmptyState";
import { SectionHeader } from "@/components/talent/SectionHeader";
import {
  activityHref,
  formatActivitySchedule,
  type ScheduleCategoryId,
  type ScheduleHubData,
} from "@/lib/app/schedule";

const monoLabel =
  "font-mono text-xs font-medium tracking-[0.08em] text-[var(--ds-muted)] uppercase";

export function ScheduleHub({
  data,
  activeCategory = null,
}: {
  data: ScheduleHubData;
  activeCategory?: ScheduleCategoryId | null;
}) {
  const category = activeCategory
    ? data.categories.find((item) => item.id === activeCategory) ?? null
    : null;

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Schedule"
        subtitle={
          category
            ? category.label
            : "Classes, sessions, events, and casting submissions in one place."
        }
        action={
          category ? (
            <Link
              href="/schedule"
              className="text-sm font-medium text-[var(--ds-accent)] hover:opacity-90"
            >
              All categories
            </Link>
          ) : null
        }
      />

      {!category ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.categories.map((item) => (
            <Link
              key={item.id}
              href={`/schedule?category=${item.id}`}
              className="rounded-[var(--ds-radius-card)] border border-[var(--ds-border)] bg-[var(--ds-surface)] p-4 transition-colors hover:border-[var(--ds-border-strong)] hover:bg-[var(--ds-surface-raised)]"
            >
              <p className={monoLabel}>{item.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--ds-text-default)]">
                {item.count}
              </p>
              <p className="mt-1 text-sm text-[var(--ds-muted)]">
                {item.count === 1 ? "item" : "items"}
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      {category?.id === "submissions" ? (
        <SubmissionList data={data} meta={category} />
      ) : category ? (
        <ActivityList
          items={data.byCategory[category.id]}
          emptyTitle={category.emptyTitle}
          emptyDescription={category.emptyDescription}
        />
      ) : (
        <ActivityList
          items={data.upcoming}
          emptyTitle="Nothing upcoming"
          emptyDescription="Create or join something to see it here."
          showRole
        />
      )}
    </div>
  );
}

function ActivityList({
  items,
  emptyTitle,
  emptyDescription,
  showRole = false,
}: {
  items: ScheduleHubData["upcoming"];
  emptyTitle: string;
  emptyDescription: string;
  showRole?: boolean;
}) {
  if (!items.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={{ href: "/home", label: "Back to Home" }}
      />
    );
  }

  return (
    <section className="space-y-3">
      <h2 className={monoLabel}>Upcoming</h2>
      <ul className="divide-y divide-[var(--ds-border)] overflow-hidden rounded-[var(--ds-radius-card)] border border-[var(--ds-border)] bg-[var(--ds-surface)]">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={activityHref(item)}
              className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-[var(--ds-surface-raised)]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--ds-text-default)]">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-[var(--ds-muted)]">
                  {[item.type, formatActivitySchedule(item), showRole ? item.role : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-[var(--ds-accent)]">Open</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SubmissionList({
  data,
  meta,
}: {
  data: ScheduleHubData;
  meta: ScheduleHubData["categories"][number];
}) {
  if (!data.submissions.length) {
    return (
      <EmptyState
        title={meta.emptyTitle}
        description={meta.emptyDescription}
        action={{ href: "/home", label: "Back to Home" }}
      />
    );
  }

  return (
    <section className="space-y-3">
      <h2 className={monoLabel}>Submissions</h2>
      <ul className="divide-y divide-[var(--ds-border)] overflow-hidden rounded-[var(--ds-radius-card)] border border-[var(--ds-border)] bg-[var(--ds-surface)]">
        {data.submissions.map((item) => {
          const title = item.projectTitle || item.roleTitle || "Casting submission";
          const subtitle = [item.roleTitle, item.status].filter(Boolean).join(" · ");
          const body = (
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--ds-text-default)]">{title}</p>
                <p className="mt-0.5 text-xs text-[var(--ds-muted)]">{subtitle || "Submitted"}</p>
              </div>
              {item.castingHref ? (
                <span className="shrink-0 text-xs font-medium text-[var(--ds-accent)]">Open</span>
              ) : null}
            </div>
          );

          return (
            <li key={item.id}>
              {item.castingHref ? (
                <Link href={item.castingHref} className="block transition-colors hover:bg-[var(--ds-surface-raised)]">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
