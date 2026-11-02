import { getActiveShell } from "@/lib/auth/profile";
import { requireCompleteProfile } from "@/lib/auth/session";
import { NotificationsPageView } from "@/components/talent-buyers/dashboard/NotificationsPageView";

export default async function UpdatesPage() {
  const profile = await requireCompleteProfile();
  return <NotificationsPageView userId={profile.id} viewerRole={getActiveShell(profile) === "community" ? "community" : "talent"} linkCastings />;
}
