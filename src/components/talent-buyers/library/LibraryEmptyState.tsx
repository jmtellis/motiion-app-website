import Link from "next/link";
import { Users } from "lucide-react";
import {
  IndustryEmptyState,
  IndustryJourney,
} from "@/components/talent-buyers/dashboard/IndustryUI";

export function LibraryEmptyState({
  title,
  body,
  primaryLabel,
  primaryHref,
  primaryOnClick,
  secondaryLabel,
  secondaryHref,
  secondaryOnClick,
  variant = "simple",
}: {
  title: string;
  body: string;
  primaryLabel: string;
  primaryHref?: string;
  primaryOnClick?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  secondaryOnClick?: () => void;
  variant?: "simple" | "collections" | "talent";
}) {
  return (
    <IndustryEmptyState
      icon={<Users size={25} />}
      title={title}
      description={body}
      actions={
        <>
          {primaryHref ? (
            <Link className="buyer-chrome-bar__cta" href={primaryHref}>
              {primaryLabel}
            </Link>
          ) : (
            <button className="buyer-chrome-bar__cta" onClick={primaryOnClick}>
              {primaryLabel}
            </button>
          )}
          {secondaryLabel &&
            (secondaryHref ? (
              <Link className="bd-btn-secondary" href={secondaryHref}>
                {secondaryLabel}
              </Link>
            ) : (
              <button className="bd-btn-secondary" onClick={secondaryOnClick}>
                {secondaryLabel}
              </button>
            ))}
        </>
      }
    >
      {variant !== "simple" && (
        <IndustryJourney
          steps={[
            {
              title: "Discover",
              description:
                "Find dancers by style, location, and the work you’re creating.",
            },
            {
              title: "Save",
              description:
                "Keep promising talent close for your next opportunity.",
            },
            {
              title: "Organize",
              description:
                "Build rosters around your projects and collaborators.",
            },
          ]}
        />
      )}
    </IndustryEmptyState>
  );
}
