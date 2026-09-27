import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { BuyerBillingSection } from "@/components/talent-buyers/dashboard/BuyerBillingSection";
import { BuyerConnectPaymentsSection } from "@/components/talent-buyers/dashboard/BuyerConnectPaymentsSection";
import {
  BuyerSettingsProfileForm,
  BuyerSettingsWorkspaceSections,
} from "@/components/talent-buyers/dashboard/BuyerSettingsProfileForm";
import { DeleteBuyerAccountButton } from "@/components/talent-buyers/dashboard/DeleteBuyerAccountButton";
import { FadeInSection } from "@/components/talent-buyers/dashboard/FadeInSection";
import { IndustryPageHeader } from "@/components/talent-buyers/dashboard/IndustryUI";
import { IndustrySettings } from "@/components/talent-buyers/dashboard/IndustrySettings";
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
      <IndustryPageHeader
        eyebrow="Your workspace, your way"
        title="Settings"
        description="Manage your profile, your team, and the details that keep work running smoothly."
      />
      <IndustrySettings
        initialSection={connectHighlight ? "payouts" : "account"}
        sections={[
          {
            id: "account",
            label: "Account",
            content: (
              <FadeInSection>
                <section className="bd-page-section space-y-4">
                  <SectionHeader
                    title="Account"
                    description="Your profile and sign-in details."
                    size="dashboard"
                  />
                  <BuyerSettingsProfileForm
                    profile={profile}
                    variant="dashboard"
                  />
                </section>
              </FadeInSection>
            ),
          },

          {
            id: "billing",
            label: "Plan & billing",
            content: (
              <FadeInSection>
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
            ),
          },

          {
            id: "payouts",
            label: "Payouts",
            content: (
              <FadeInSection>
                <section className="bd-page-section space-y-4">
                  <SectionHeader
                    title="Payouts"
                    description="Stripe Connect for ticket and class payments."
                    size="dashboard"
                  />
                  <BuyerConnectPaymentsSection
                    highlightReturn={connectHighlight}
                  />
                </section>
              </FadeInSection>
            ),
          },

          {
            id: "workspace",
            label: "Workspace & team",
            content: (
              <FadeInSection>
                <section className="bd-page-section space-y-4">
                  <SectionHeader title="Workspace settings" size="dashboard" />
                  <BuyerSettingsWorkspaceSections
                    organization={settingsExtras.organization}
                    teamMembers={settingsExtras.teamMembers}
                    notificationPreferences={
                      settingsExtras.notificationPreferences
                    }
                    verificationLinks={settingsExtras.verificationLinks}
                  />
                </section>
              </FadeInSection>
            ),
          },

          {
            id: "security",
            label: "Delete account",
            content: (
              <FadeInSection>
                <section className="bd-page-section space-y-4">
                  <SectionHeader
                    title="Delete account"
                    description="Permanently remove your talent buyer profile from Motiion."
                    size="dashboard"
                  />
                  <div className="bd-muted-panel p-5">
                    <p className="text-sm text-white/58">
                      Deleting your account removes your profile, workspace
                      data, and sign-in access. You will be returned to the
                      Motiion homepage afterward.
                    </p>
                    <div className="mt-4">
                      <DeleteBuyerAccountButton />
                    </div>
                  </div>
                </section>
              </FadeInSection>
            ),
          },
        ]}
      />
    </BuyerAppPage>
  );
}
