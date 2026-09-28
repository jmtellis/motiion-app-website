import { requireCompleteProfile } from "@/lib/auth/session";
import { NotificationsPageView } from "@/components/talent-buyers/dashboard/NotificationsPageView";

export default async function UpdatesPage() {
  const profile = await requireCompleteProfile();
  return <NotificationsPageView userId={profile.id} linkCastings />;
}
