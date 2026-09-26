import { BenefitIllustration } from "./BenefitIllustration";
import { TalentPortfolioVideo } from "./TalentPortfolioVideo";
import type { AudienceBenefit, BenefitIconKey } from "@/lib/marketing/marketing-pages";
import "./illustrated-benefits.css";

const illustrations: Partial<Record<BenefitIconKey, string>> = {
  images: "talent-portfolio", search: "search-orbit", mail: "opportunity-letter",
  bookmark: "industry-roster", "folder-kanban": "casting-board",
  "user-circle": "people-cards", users: "training-steps", sparkles: "event-calendar",
};

const talentVideoPreviews: Record<string, string> = {
  "talent-portfolio": "/marketing/videos/site-talent-1",
  "talent-discovery": "/marketing/videos/site-talent-2",
  "talent-inbox": "/marketing/videos/site-talent-3",
};

export function IllustratedBenefits({ benefits }: { benefits: AudienceBenefit[] }) {
  return <div className="illustrated-benefits">{benefits.map((benefit, index) => (
    <article className="illustrated-benefits__card" key={benefit.title}>
      <span className="illustrated-benefits__number" aria-hidden="true">0{index + 1}</span>
      {benefit.preview && talentVideoPreviews[benefit.preview] ? (
        <TalentPortfolioVideo
          src={`${talentVideoPreviews[benefit.preview]}.mp4`}
          poster={`${talentVideoPreviews[benefit.preview]}-poster.jpg`}
        />
      ) : (
        <BenefitIllustration name={illustrations[benefit.icon] ?? "community-connections"} />
      )}
      <h3>{benefit.title}</h3><p>{benefit.description}</p>
    </article>
  ))}</div>;
}
