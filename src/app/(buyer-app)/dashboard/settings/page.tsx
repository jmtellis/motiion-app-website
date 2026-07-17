import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { BuyerPageChromeRegistrar } from "@/components/talent-buyers/dashboard/BuyerPageChromeRegistrar";
import { BuyerBillingSection } from "@/components/talent-buyers/dashboard/BuyerBillingSection";
import { BuyerConnectPaymentsSection } from "@/components/talent-buyers/dashboard/BuyerConnectPaymentsSection";
import {
  BuyerSettingsProfileForm,
  BuyerSettingsWorkspaceSections,
} from "@/components/talent-buyers/dashboard/BuyerSettingsProfileForm";
import { DeleteBuyerAccountButton } from "@/components/talent-buyers/dashboard/DeleteBuyerAccountButton";
import { FadeInSection } from "@/components/talent-buyers/dashboard/FadeInSection";
import { PageHeader } from "@/components/talent-buyers/dashboard/PageHeader";
import { SectionHeader } from "@/components/talent-buyers/dashboard/SectionHeader";
import { fetchBuyerSettingsExtras } from "@/lib/talent-buyers/buyer-settings";
import { requireHiringAccount } from "@/lib/auth/session";
import { getUserEntitlement } from "@/lib/billing/entitlement";

export default async function BuyerSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const profile = await requireHiringAccount();
  const params = await searchParams;
  const [entitlement, settingsExtras] = await Promise.all([
    getUserEntitlement(profile.id),
    fetchBuyerSettingsExtras(profile.id),
  ]);
  const connectHighlight =
    params.connect === "return" || params.connect === "refresh";

  return (
    <BuyerAppPage>
      <BuyerPageChromeRegistrar title="Settings" />
      <FadeInSection>
        <PageHeader
          variant="dashboard"
          title="Settings"
          showTitle={false}
          description="Edit your account details and manage workspace preferences."
        />
      </FadeInSection>

      <FadeInSection delay={0.05}>
        <section className="bd-page-section space-y-4">
          <SectionHeader title="Account" description="Your profile and sign-in details." size="dashboard" />
          <BuyerSettingsProfileForm profile={profile} variant="dashboard" />
        </section>
      </FadeInSection>

      <FadeInSection delay={0.08}>
        <section className="bd-page-section space-y-4">
          <SectionHeader
            title="Billing"
            description="Your subscription plan and payment settings."
            size="dashboard"
          />
          <BuyerBillingSection
            tier={entitlement.tier}
            active={entitlement.active}
            currentPeriodEnd={entitlement.currentPeriodEnd}
          />
        </section>
      </FadeInSection>

      <FadeInSection delay={0.09}>
        <section className="bd-page-section space-y-4">
          <SectionHeader
            title="Payouts"
            description="Stripe Connect for ticket and class payments."
            size="dashboard"
          />
          <BuyerConnectPaymentsSection highlightReturn={connectHighlight} />
        </section>
      </FadeInSection>

      <FadeInSection delay={0.1}>
        <section className="bd-page-section space-y-4">
          <SectionHeader title="Workspace settings" size="dashboard" />
          <BuyerSettingsWorkspaceSections
            organization={settingsExtras.organization}
            teamMembers={settingsExtras.teamMembers}
            notificationPreferences={settingsExtras.notificationPreferences}
            verificationLinks={settingsExtras.verificationLinks}
          />
        </section>
      </FadeInSection>

      <FadeInSection delay={0.12}>
        <section className="bd-page-section space-y-4">
          <SectionHeader
            title="Delete account"
            description="Permanently remove your talent buyer profile from Motiion."
            size="dashboard"
          />
          <div className="bd-muted-panel p-5">
            <p className="text-sm text-white/58">
              Deleting your account removes your profile, workspace data, and sign-in access. You will be returned to the
              Motiion homepage afterward.
            </p>
            <div className="mt-4">
              <DeleteBuyerAccountButton />
            </div>
          </div>
        </section>
      </FadeInSection>
    </BuyerAppPage>
  );
}
