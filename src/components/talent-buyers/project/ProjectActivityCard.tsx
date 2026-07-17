import Link from "next/link";
import { Calendar, Clapperboard, GraduationCap, Users } from "lucide-react";

import { BuyerCoverImage } from "@/components/talent-buyers/dashboard/BuyerCoverImage";
import { formatBuyerRelativeDate, labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import type { ProjectWorkspaceItem, ProjectWorkspaceItemKind } from "@/lib/talent-buyers/project-workspace-items";

import "../dashboard/projects-hub.css";

const KIND_LABELS: Record<ProjectWorkspaceItemKind, string> = {
  casting: "Casting",
  class: "Class",
  session: "Session",
  event: "Event",
};

function KindIcon({ kind }: { kind: ProjectWorkspaceItemKind }) {
  const className = "size-3.5";
  switch (kind) {
    case "casting":
      return <Clapperboard className={className} aria-hidden />;
    case "class":
      return <GraduationCap className={className} aria-hidden />;
    case "session":
      return <Users className={className} aria-hidden />;
    case "event":
      return <Calendar className={className} aria-hidden />;
  }
}

export function ProjectActivityCard({
  item,
  cardRef,
  highlighted,
}: {
  item: ProjectWorkspaceItem;
  cardRef?: (node: HTMLElement | null) => void;
  highlighted?: boolean;
}) {
  return (
    <Link
      href={item.href}
      ref={cardRef}
      data-workspace-item-id={item.id}
      className={`bd-visual-card bd-interactive-card group block ${highlighted ? "ring-2 ring-[#2dd4bf]/50" : ""}`}
    >
      <div className="bd-visual-card__media">
        <BuyerCoverImage
          src={item.coverImageUrl ?? ""}
          alt=""
          aspectRatio="16/9"
          fallbackId={item.id}
          fallbackCategory="project"
        />
        <span className="bd-visual-card__status shrink-0 px-2.5 py-1 text-xs font-semibold bd-chip">
          {labelFromSnake(item.status)}
        </span>
      </div>

      <div className="bd-visual-card__body">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] uppercase text-white/42">
          <KindIcon kind={item.kind} />
          {KIND_LABELS[item.kind]}
        </p>
        <h3 className="mt-1 text-base font-semibold text-white/92 group-hover:text-[var(--accent)]">
          {item.title}
        </h3>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/50">
          <div>
            <dt className="text-white/42">Updated</dt>
            <dd className="font-medium text-white/80">{formatBuyerRelativeDate(item.updatedAt)}</dd>
          </div>
          <div>
            <dt className="text-white/42">Details</dt>
            <dd className="font-medium text-white/80">{item.subtitle}</dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}

export function workspaceItemIcon(kind: ProjectWorkspaceItemKind) {
  return <KindIcon kind={kind} />;
}
