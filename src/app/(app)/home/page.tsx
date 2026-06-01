import { HomeFeed } from "@/components/app/HomeFeed";
import { fetchHomeFeed } from "@/lib/app/home";
import { requireCompleteProfile } from "@/lib/auth/session";

export default async function HomePage() {
  const profile = await requireCompleteProfile();
  const feed = await fetchHomeFeed(profile.id);
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? `Good morning, ${profile.fullName.split(" ")[0]}`
      : hour < 18
        ? `Good afternoon, ${profile.fullName.split(" ")[0]}`
        : `Good evening, ${profile.fullName.split(" ")[0]}`;

  return <HomeFeed greeting={greeting} feed={feed} />;
}
