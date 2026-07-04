import Link from "next/link";
import { ArrowUpRight, FileText, Link2, Users } from "lucide-react";

import { formatBuyerRelativeDate, labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import type { BuyerProjectStatus, BuyerProjectSummary } from "@/types/talent-buyer-dashboard";

function statusStyles(status: BuyerProjectStatus, dashboard = false) {
  if (dashboard) {
    switch (status) {
      case "active":
        return "border-[color-mix(in_oklab,var(--accent),transparent_50%)] bg-[color-mix(in_oklab,var(--accent),transparent_85%)] text-[var(--accent)]";
      default:
        return "";
    }
  }

  switch (status) {
    case "active":
      return "border-[color-mix(in_oklab,var(--accent),white_70%)] bg-[color-mix(in_oklab,var(--accent),white_92%)] text-[var(--accent-dark)]";
    case "shared":
      return "border-[#d4e4ff] bg-[#eef4ff] text-[#2563eb]";
    case "draft":
      return "border-[var(--line)] bg-[var(--tone)] text-[var(--ink-soft)]";
    case "archived":
      return "border-[var(--line)] bg-[var(--tone)] text-[var(--ink-soft)]";
    default:
      return "border-[var(--line)] bg-[var(--tone)] text-[var(--ink-soft)]";
  }
}

function ProjectRow({ project, dashboard = false }: { project: BuyerProjectSummary; dashboard?: boolean }) {
  const chipClass = dashboard ? "bd-chip" : "rounded-[var(--radius-chip)] border";

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`${dashboard ? "bd-row-card" : "ui-card-interactive group block p-4"} md:hidden`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold tracking-[0.12em] uppercase ${dashboard ? "text-white/42" : "text-[var(--accent)]"}`}>
            {labelFromSnake(project.projectType)}
          </p>
          <p className={`mt-1 text-base font-semibold ${dashboard ? "text-white/92" : "text-[var(--ink)]"}`}>{project.title}</p>
        </div>
        <span className={`shrink-0 px-2.5 py-1 text-xs font-semibold ${chipClass} ${statusStyles(project.status, dashboard)}`}>
          {labelFromSnake(project.status)}
        </span>
      </div>
      <div className={`mt-3 flex flex-wrap items-center gap-3 text-sm ${dashboard ? "text-white/50" : "text-[var(--ink-soft)]"}`}>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" aria-hidden />
          {project.talentCount} talent
        </span>
        {project.notesCount != null ? (
          <span className="inline-flex items-center gap-1.5">
            <FileText className="size-3.5" aria-hidden />
            {project.notesCount} notes
          </span>
        ) : null}
        {project.sharedLinksCount != null ? (
          <span className="inline-flex items-center gap-1.5">
            <Link2 className="size-3.5" aria-hidden />
            {project.sharedLinksCount} shared
          </span>
        ) : null}
        <span className="ml-auto text-xs">{formatBuyerRelativeDate(project.lastUpdated)}</span>
      </div>
    </Link>
  );
}

export function ProjectTable({
  projects,
  variant = "default",
}: {
  projects: BuyerProjectSummary[];
  variant?: "default" | "dashboard";
}) {
  const dashboard = variant === "dashboard";
  const wrapperClass = dashboard ? "bd-table-wrap" : "ui-card overflow-hidden";
  const chipClass = dashboard ? "bd-chip" : "rounded-[var(--radius-chip)] border";

  return (
    <div className={wrapperClass}>
      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className={`text-xs font-semibold tracking-[0.08em] uppercase ${dashboard ? "" : "border-b border-[var(--line)] bg-[var(--tone)]/50 text-[var(--ink-soft)]"}`}>
              <th className="px-0 py-4 font-semibold">Project</th>
              <th className="px-4 py-4 font-semibold">Type</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold">Talent</th>
              {!dashboard ? <th className="px-4 py-4 font-semibold">Pulse</th> : null}
              <th className="px-4 py-4 font-semibold">{dashboard ? "Notes" : "Activity"}</th>
              <th className="px-4 py-4 font-semibold">Updated</th>
              <th className="px-0 py-4 text-right font-semibold">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className={dashboard ? "" : "divide-y divide-[var(--line)]"}>
            {projects.map((project) => (
              <tr key={project.id} className={`group transition ${dashboard ? "" : "hover:bg-[var(--tone)]/35"}`}>
                <td className="py-4 pr-4">
                  <Link href={`/projects/${project.id}`} className="block min-w-0">
                    <p className={`font-semibold transition ${dashboard ? "text-white/92 group-hover:text-[var(--accent)]" : "text-[var(--ink)] group-hover:text-[var(--accent-dark)]"}`}>
                      {project.title}
                    </p>
                  </Link>
                </td>
                <td className={`px-4 py-4 ${dashboard ? "text-white/50" : "text-[var(--ink-soft)]"}`}>{labelFromSnake(project.projectType)}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex px-2.5 py-1 text-xs font-semibold ${chipClass} ${statusStyles(project.status, dashboard)}`}>
                    {labelFromSnake(project.status)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 font-medium ${dashboard ? "text-white/80" : "text-[var(--ink)]"}`}>
                    <Users className={`size-3.5 ${dashboard ? "text-white/42" : "text-[var(--ink-soft)]"}`} aria-hidden />
                    {project.talentCount}
                  </span>
                </td>
                {!dashboard ? (
                  <td className="px-4 py-4">
                    <div className="flex h-8 items-end gap-1" aria-hidden>
                      {Array.from({ length: 8 }, (_, index) => (
                        <span
                          key={index}
                          className="w-1 rounded-full bg-[color-mix(in_oklab,var(--accent),white_35%)]"
                          style={{ height: `${30 + ((index * 17) % 40)}%` }}
                        />
                      ))}
                    </div>
                  </td>
                ) : null}
                <td className="px-4 py-4">
                  <div className={`flex flex-wrap gap-2 text-xs ${dashboard ? "text-white/50" : "text-[var(--ink-soft)]"}`}>
                    {project.notesCount != null ? (
                      <span className={`${dashboard ? "bd-chip" : "ui-chip"} gap-1 px-2 py-1`}>
                        <FileText className="size-3" aria-hidden />
                        {project.notesCount}
                      </span>
                    ) : null}
                    {project.sharedLinksCount != null ? (
                      <span className={`${dashboard ? "bd-chip" : "ui-chip"} gap-1 px-2 py-1`}>
                        <Link2 className="size-3" aria-hidden />
                        {project.sharedLinksCount}
                      </span>
                    ) : null}
                    {project.notesCount == null && project.sharedLinksCount == null ? (
                      <span>—</span>
                    ) : null}
                  </div>
                </td>
                <td className={`px-4 py-4 ${dashboard ? "text-white/42" : "text-[var(--ink-soft)]"}`}>
                  {formatBuyerRelativeDate(project.lastUpdated)}
                </td>
                <td className="py-4 pl-4 text-right">
                  <Link
                    href={`/projects/${project.id}`}
                    className={`inline-flex items-center gap-1 text-sm font-medium opacity-0 transition group-hover:opacity-100 hover:underline ${dashboard ? "text-[var(--accent)]" : "text-[var(--accent-dark)]"}`}
                    aria-label={`Open ${project.title}`}
                  >
                    Open
                    <ArrowUpRight className="size-3.5" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`space-y-1 ${dashboard ? "pt-2" : "space-y-3 p-4"} md:hidden`}>
        {projects.map((project) => (
          <ProjectRow key={project.id} project={project} dashboard={dashboard} />
        ))}
      </div>
    </div>
  );
}
