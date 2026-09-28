import Link from "next/link";

import { PortfolioView } from "@/components/app/PortfolioView";
import { fetchOwnPortfolioProfile } from "@/lib/app/portfolio";
import { fetchPortfolioOwnerData } from "@/lib/app/portfolio-owner";
import { toPortfolioEditorDraft } from "@/lib/app/portfolio-editor";
import { fetchTalentAgencies } from "@/lib/agencies/fetch-talent-agencies";
import { requireTalentAccount } from "@/lib/auth/session";
import { fetchTalentSetupSnapshot } from "@/lib/talent/fetch-setup-snapshot";
import { buildChecklist, primaryCtaTitle } from "@/lib/talent/profile-setup";

export default async function PortfolioPage() {
  const profile = await requireTalentAccount();
  const [portfolio, owner, setup, agencies] = await Promise.all([
    fetchOwnPortfolioProfile(profile),
    fetchPortfolioOwnerData(profile.id),
    fetchTalentSetupSnapshot(profile.id),
    fetchTalentAgencies(),
  ]);

  if (!portfolio || !owner) {
    return (
      <div className="ui-muted-panel px-6 py-10 text-center">
        <h1 className="text-2xl font-semibold text-[var(--ink)]">Finish your portfolio</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--ink-soft)]">
          Complete onboarding with a username and headshot to publish your Motiion portfolio.
        </p>
        <Link href="/onboarding" className="btn-primary mt-6 inline-flex">
          Continue onboarding
        </Link>
      </div>
    );
  }

  const editor = toPortfolioEditorDraft(
    setup
      ? {
          displayName: setup.profile.displayName || portfolio.full_name,
          socials: setup.socials,
          workingLocations: setup.profile.workingLocations,
          styles: setup.profile.styles ?? portfolio.styles,
          skills: setup.profile.skills ?? portfolio.skills,
          training: setup.training,
          representation: setup.profile.representation ?? portfolio.representation,
          agent: setup.profile.agent,
          additionalRepresentations: setup.profile.additionalRepresentations,
          unionStatus: setup.profile.unionStatus ?? portfolio.union_status,
          unionMemberId: setup.profile.unionMemberId,
          gender: setup.profile.gender ?? portfolio.gender,
          ethnicity: setup.profile.ethnicity ?? portfolio.ethnicity,
          height: setup.profile.height ?? portfolio.height,
          eyeColor: setup.profile.eyeColor ?? portfolio.eye_color,
          hairColor: setup.profile.hairColor ?? portfolio.hair_color,
        }
      : {
          displayName: portfolio.full_name,
          socials: { instagram: portfolio.instagram_url ?? "", youtube: portfolio.youtube_url ?? "" },
          styles: portfolio.styles,
          skills: portfolio.skills,
          training: portfolio.training,
          representation: portfolio.representation,
          unionStatus: portfolio.union_status,
          gender: portfolio.gender,
          ethnicity: portfolio.ethnicity,
          height: portfolio.height,
          eyeColor: portfolio.eye_color,
          hairColor: portfolio.hair_color,
          workingLocations: portfolio.location ? [portfolio.location] : [],
        },
  );

  const checklist = setup
    ? buildChecklist({
        profile: setup.profile,
        reviewStatus: setup.reviewStatus,
        highlightsCount: setup.highlightsCount,
        socialCount: setup.socialCount,
      })
    : [];
  const completedCount = checklist.filter((item) => item.isComplete).length;
  const next = checklist.find((item) => !item.isComplete);

  return (
    <PortfolioView
      profile={portfolio}
      owner={owner}
      editor={editor}
      agencies={agencies}
      completion={
        next
          ? { completed: completedCount, total: checklist.length, cta: primaryCtaTitle(completedCount, next.action) }
          : null
      }
      underReview={setup?.reviewStatus === "pending"}
    />
  );
}
