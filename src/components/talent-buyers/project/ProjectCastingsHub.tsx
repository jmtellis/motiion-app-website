"use client";

import Link from "next/link";

import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import { EmptyState } from "@/components/talent-buyers/dashboard/EmptyState";
import { SectionHeader } from "@/components/talent-buyers/dashboard/SectionHeader";
import type { ProjectCastingSummary } from "@/lib/talent-buyers/castings";
import { labelFromSnake } from "@/lib/talent-buyers/dashboard-data";

export function ProjectCastingsHub({
  projectId,
  projectTitle,
  castings,
}: {
  projectId: string;
  projectTitle: string;
  castings: ProjectCastingSummary[];
}) {
  useRegisterBuyerChrome({
    breadcrumbs: [
      { label: "Projects", href: "/projects" },
      { label: projectTitle, href: `/projects/${projectId}` },
      { label: "Castings" },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader title="Castings" description="Manage castings and roles for this project." size="dashboard" />
        <Link href={`/projects/${projectId}/castings/new`} className="bd-btn-accent">
          Add casting
        </Link>
      </div>

      {castings.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {castings.map((casting) => (
            <li key={casting.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white/92">{casting.title}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {labelFromSnake(casting.status)} · {casting.roleCount} roles · {labelFromSnake(casting.visibility)}
                    {casting.isLegacy ? " · Legacy" : ""}
                  </p>
                </div>
                {!casting.isLegacy ? (
                  <Link
                    href={`/projects/${projectId}/castings/${casting.id}/edit`}
                    className="text-sm font-medium text-[#2dd4bf]"
                  >
                    Edit
                  </Link>
                ) : (
                  <Link href={`/projects/${projectId}/edit`} className="text-sm font-medium text-[#2dd4bf]">
                    Edit legacy
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          variant="dashboard"
          title="No castings yet"
          description="Add a casting to collect submissions and manage roles for this project."
          actionLabel="Add casting"
          actionHref={`/projects/${projectId}/castings/new`}
        />
      )}
    </div>
  );
}
