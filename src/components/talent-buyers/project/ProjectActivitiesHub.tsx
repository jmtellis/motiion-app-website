"use client";

import Link from "next/link";

import { CreateActivityButton } from "@/components/talent-buyers/dashboard/CreateActivityButton";
import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { SectionHeader } from "@/components/talent-buyers/dashboard/SectionHeader";
import type { ProjectActivitySummary } from "@/lib/talent-buyers/project-activities";
import { labelFromSnake } from "@/lib/talent-buyers/dashboard-data";

export function ProjectActivitiesHub({
  projectId,
  projectTitle,
  activities,
}: {
  projectId: string;
  projectTitle: string;
  activities: ProjectActivitySummary[];
}) {
  useRegisterBuyerChrome({
    breadcrumbs: [
      { label: "Projects", href: "/projects" },
      { label: projectTitle, href: `/projects/${projectId}` },
      { label: "Activities" },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader
          title="Activities"
          description="Classes, sessions, and events linked to this project."
          size="dashboard"
        />
        <CreateActivityButton projectId={projectId} triggerLabel="Create activity" showPlusIcon />
      </div>

      {activities.length ? (
        <ul className="space-y-2">
          {activities.map((activity) => (
            <li key={activity.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white/90">{activity.title}</p>
                  <p className="text-xs text-white/45">
                    {labelFromSnake(activity.eventType)} · {activity.attendeeCount} attendees
                  </p>
                </div>
                <Link href={`/calendar/${activity.id}`} className="text-sm text-[#2dd4bf]">
                  Manage
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          variant="dashboard"
          title="No activities yet"
          description="Schedule a class, session, or event for talent connected to this project."
        />
      )}
    </div>
  );
}
