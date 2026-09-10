import { FeaturedTalentInvitesList } from "@/components/app/FeaturedTalentInvitesList";
import { HomeFeed } from "@/components/app/HomeFeed";
import { InvitationList } from "@/components/app/InvitationList";
import { ProfileCompletionCard } from "@/components/talent/ProfileCompletionCard";
import { listMyFeaturedTalentInvitesAction } from "@/app/(buyer-app)/(paid)/calendar/featured-talent-actions";
import { fetchHomeFeed } from "@/lib/app/home";
import { listTalentInvitations } from "@/lib/app/invitations";
import { requireTalentAccount } from "@/lib/auth/session";
import { fetchTalentSetupSnapshot } from "@/lib/talent/fetch-setup-snapshot";
import { homeCompletionCopy } from "@/lib/talent/copy";
import {
  buildChecklist,
  focusWindow,
  primaryCtaTitle,
  statusLineForReview,
} from "@/lib/talent/profile-setup";

export default async function HomePage() {
  const profile = await requireTalentAccount();
  const [feed, invitationResult, featuredInvites, setup] = await Promise.all([
    fetchHomeFeed(profile.id),
    listTalentInvitations(),
    listMyFeaturedTalentInvitesAction(),
    fetchTalentSetupSnapshot(profile.id),
  ]);
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? `Good morning, ${profile.fullName.split(" ")[0]}`
      : hour < 18
        ? `Good afternoon, ${profile.fullName.split(" ")[0]}`
        : `Good evening, ${profile.fullName.split(" ")[0]}`;

  const featuredSlot =
    featuredInvites.ok && featuredInvites.invites.length > 0 ? (
      <FeaturedTalentInvitesList invites={featuredInvites.invites} />
    ) : null;

  let completionSlot: React.ReactNode = null;
  if (setup) {
    const checklist = buildChecklist({
      profile: setup.profile,
      reviewStatus: setup.reviewStatus,
      highlightsCount: setup.highlightsCount,
      socialCount: setup.socialCount,
    });
    const incomplete = checklist.filter((item) => !item.isComplete);
    if (incomplete.length > 0) {
      const focus = focusWindow(checklist);
      const completedCount = checklist.filter((item) => item.isComplete).length;
      const next = incomplete[0];
      completionSlot = (
        <ProfileCompletionCard
          displayName={
            setup.profile.displayName?.trim() ||
            [setup.profile.firstName, setup.profile.lastName].filter(Boolean).join(" ") ||
            profile.fullName
          }
          headshotUrl={setup.profile.headshotUrls?.[0]}
          username={setup.username}
          headline={homeCompletionCopy.headline}
          cta={primaryCtaTitle(completedCount, next?.action)}
          statusLine={statusLineForReview(setup.reviewStatus)}
          completedCount={completedCount}
          totalCount={checklist.length}
          focusItems={focus}
          href="/profile/setup"
        />
      );
    }
  }

  return (
    <HomeFeed
      greeting={greeting}
      feed={feed}
      completionSlot={completionSlot}
      invitationsSlot={
        <>
          {featuredSlot}
          <InvitationList invitations={invitationResult.invitations} />
        </>
      }
    />
  );
}
