import { HomeFeed } from "@/components/app/HomeFeed";
import { InvitationList } from "@/components/app/InvitationList";
import { fetchHomeFeed } from "@/lib/app/home";
import { listTalentInvitations } from "@/lib/app/invitations";
import { requireTalentAccount } from "@/lib/auth/session";

export default async function HomePage() {
  const profile = await requireTalentAccount();
  const [feed, invitationResult] = await Promise.all([
    fetchHomeFeed(profile.id),
    listTalentInvitations(),
  ]);
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? `Good morning, ${profile.fullName.split(" ")[0]}`
      : hour < 18
        ? `Good afternoon, ${profile.fullName.split(" ")[0]}`
        : `Good evening, ${profile.fullName.split(" ")[0]}`;

  return (
    <HomeFeed
      greeting={greeting}
      feed={feed}
      invitationsSlot={<InvitationList invitations={invitationResult.invitations} />}
    />
  );
}
