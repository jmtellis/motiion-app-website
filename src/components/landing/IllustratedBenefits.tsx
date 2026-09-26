import { BenefitIllustration } from "./BenefitIllustration";
import { TalentPortfolioVideo } from "./TalentPortfolioVideo";
import type { AudienceBenefit, BenefitIconKey } from "@/lib/marketing/marketing-pages";
import "./illustrated-benefits.css";

const illustrations: Partial<Record<BenefitIconKey, string>> = {
  images: "talent-portfolio", search: "search-orbit", mail: "opportunity-letter",
  bookmark: "industry-roster", "folder-kanban": "casting-board",
  "user-circle": "people-cards", users: "training-steps", sparkles: "event-calendar",
};

const talentVideoPreviews = new Set(["talent-portfolio", "talent-discovery", "talent-inbox"]);

export function IllustratedBenefits({ benefits }: { benefits: AudienceBenefit[] }) {
  return <div className="illustrated-benefits">{benefits.map((benefit, index) => (
    <article className="illustrated-benefits__card" key={benefit.title}>
      <span className="illustrated-benefits__number" aria-hidden="true">0{index + 1}</span>
      {benefit.preview && talentVideoPreviews.has(benefit.preview) ? (
        <TalentPortfolioVideo
          src={benefit.preview === "talent-discovery" ? "/marketing/videos/site-talent-2.mp4" : undefined}
          poster={benefit.preview === "talent-discovery" ? "/marketing/videos/site-talent-2-poster.jpg" : undefined}
        />
      ) : (
        <BenefitIllustration name={illustrations[benefit.icon] ?? "community-connections"} />
      )}
      <h3>{benefit.title}</h3><p>{benefit.description}</p>
    </article>
  ))}</div>;
}
