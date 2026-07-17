import { labelFromSnake } from "@/lib/talent-buyers/dashboard-data";
import { getProjectTypeLabel } from "@/lib/talent-buyers/project-types";
import { resolveBuyerCoverImage } from "@/lib/talent-buyers/stock-images";

import { BuyerCoverImage } from "./BuyerCoverImage";

export function ProjectDetailHero({
  id,
  coverImageUrl,
  title,
  projectType,
  status,
  showTitle = true,
}: {
  id: string;
  coverImageUrl?: string | null;
  title?: string;
  projectType: string;
  status: string;
  showTitle?: boolean;
}) {
  const coverSrc = resolveBuyerCoverImage(id, coverImageUrl, "project");

  return (
    <div className="bd-project-hero relative overflow-hidden">
      <BuyerCoverImage
        src={coverSrc}
        alt=""
        aspectRatio="21/9"
        overlay
        fallbackId={id}
        fallbackCategory="project"
      />
      <div className="bd-project-hero__meta">
        <p className="text-xs font-semibold tracking-[0.14em] text-white/50 uppercase">
          {getProjectTypeLabel(projectType)}
        </p>
        {showTitle && title ? (
          <h2 className="mt-1 text-xl font-semibold text-white/95 sm:text-2xl">{title}</h2>
        ) : null}
        <span className="bd-chip mt-3 inline-flex px-2.5 py-1 text-xs font-semibold text-white/80">
          {labelFromSnake(status)}
        </span>
      </div>
    </div>
  );
}
