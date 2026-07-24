import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { NotificationsPageView } from "@/components/talent-buyers/dashboard/NotificationsPageView";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function BuyerNotificationsPage() {
  const profile = await requireHiringAccount();

  return (
    <BuyerAppPage fullWidth>
      <NotificationsPageView userId={profile.id} />
    </BuyerAppPage>
  );
}
