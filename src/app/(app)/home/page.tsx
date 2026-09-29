import Link from "next/link";
import { FileSignature } from "lucide-react";

import { HomeDiscovery } from "@/components/app/HomeDiscovery";
import { HomeFeed } from "@/components/app/HomeFeed";
import { HomeListings } from "@/components/app/HomeListings";
import { fetchUpcomingClassesAndSessions } from "@/lib/app/home-opportunities";
import { requireTalentAccount } from "@/lib/auth/session";
import { countTalentDealMemosAwaiting } from "@/lib/booking/deal-memo-data";

export default async function HomePage() {
  const profile = await requireTalentAccount();
  const [activities, awaitingDealMemos] = await Promise.all([
    fetchUpcomingClassesAndSessions(),
    countTalentDealMemosAwaiting(profile.id),
  ]);
  const firstName = profile.fullName.split(" ")[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? `Good morning, ${firstName}` : hour < 18 ? `Good afternoon, ${firstName}` : `Good evening, ${firstName}`;

  return (
    <HomeFeed
      greeting={greeting}
      bookingSlot={
        awaitingDealMemos ? (
          <p className="talent-launch-banner" role="status">
            <FileSignature size={16} aria-hidden />
            <span>
              <strong>
                {awaitingDealMemos === 1 ? "A deal memo needs your response." : `${awaitingDealMemos} deal memos need your response.`}
              </strong>
            </span>
            <Link href="/deal-memos">Review</Link>
          </p>
        ) : null
      }
      discoverySlot={<HomeDiscovery />}
      listingsSlot={<HomeListings activities={activities} />}
    />
  );
}
