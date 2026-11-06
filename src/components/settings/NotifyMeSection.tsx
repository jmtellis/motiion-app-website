import { fetchReferrerFollowing } from "@/lib/talent/referrer-lists";
import { NotifyMePanel } from "./NotifyMePanel";

export async function NotifyMeSection({ accountId }: { accountId: string }) {
  const result = await fetchReferrerFollowing();
  return <NotifyMePanel key={accountId} initial={result} />;
}
