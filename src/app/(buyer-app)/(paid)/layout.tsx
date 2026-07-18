import { PaywallCard } from "@/components/talent-buyers/PaywallCard";
import { requireHiringAccount } from "@/lib/auth/session";
import { isIndustryLocked } from "@/lib/billing/gate";

/**
 * Gates every industry tool route behind an active/trialing Pro subscription.
 * Settings stays outside this group so locked users can still start checkout.
 */
export default async function PaidIndustryLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireHiringAccount();
  if (await isIndustryLocked(profile.id)) {
    return <PaywallCard feature="Industry Pro tools" />;
  }
  return children;
}
