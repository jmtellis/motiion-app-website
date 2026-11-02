import { ReferralsPanel } from "@/components/settings/ReferralsPanel";
import { NotificationSettingsSection } from "@/components/settings/NotificationSettingsSection";
import { BlockedUsersSection } from "@/components/settings/BlockedUsersSection";
import { AccountSignInSettings } from "@/components/settings/AccountSignInSettings";
import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { BuyerBillingSection } from "@/components/talent-buyers/dashboard/BuyerBillingSection";
import { BuyerConnectPaymentsSection } from "@/components/talent-buyers/dashboard/BuyerConnectPaymentsSection";
import {
  BuyerSettingsProfileForm,
  BuyerSettingsWorkspaceSections,
} from "@/components/talent-buyers/dashboard/BuyerSettingsProfileForm";
import { DeleteBuyerAccountButton } from "@/components/talent-buyers/dashboard/DeleteBuyerAccountButton";
import { SignOutButton } from "@/components/talent-buyers/dashboard/SignOutButton";
import { FadeInSection } from "@/components/talent-buyers/dashboard/FadeInSection";
import { IndustryPageHeader } from "@/components/talent-buyers/dashboard/IndustryUI";
import { IndustrySettings } from "@/components/talent-buyers/dashboard/IndustrySettings";
import { SectionHeader } from "@/components/talent-buyers/dashboard/SectionHeader";
import { SettingsAdminAnalyticsSection } from "@/components/settings/SettingsAdminAnalyticsSection";
import { fetchBuyerSettingsExtras } from "@/lib/talent-buyers/buyer-settings";
import { isPlatformAdmin, requireHiringAccount } from "@/lib/auth/session";
import { getUserEntitlement } from "@/lib/billing/entitlement";

export default async function BuyerSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string; section?: string; referral?: string }>;
}) {
  const profile = await requireHiringAccount();
  const params = await searchParams;
  const [entitlement, settingsExtras, admin] = await Promise.all([
    getUserEntitlement(profile.id),
    fetchBuyerSettingsExtras(profile.id),
    isPlatformAdmin(),
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
        initialSection={connectHighlight ? "payouts" : params.section === "workspace" ? "workspace" : params.section === "billing" ? "billing" : params.section === "privacy" ? "privacy" : params.section === "security" ? "security" : "account"}
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
                  {admin ? <SettingsAdminAnalyticsSection variant="industry" /> : null}
                  <BuyerSettingsProfileForm
                    profile={profile}
                    variant="dashboard"
                  />
                  <AccountSignInSettings email={profile.email ?? ""} />
                  <div className="bd-muted-panel p-5">
                    <p className="text-sm font-medium text-white">Sign out</p>
                    <p className="mt-1 text-sm text-white/58">
                      Sign out of Motiion on this device. Your profile and
                      workspace stay on your account.
                    </p>
                    <div className="mt-4">
                      <SignOutButton />
                    </div>
                  </div>
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
                    source={entitlement.source}
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
                  {settingsExtras.error ? <div role="alert" className="bd-muted-panel p-5"><p>{settingsExtras.error}</p><a href="/dashboard/settings?section=workspace" className="bd-btn-secondary mt-3">Try again</a></div> : <BuyerSettingsWorkspaceSections
                    organization={settingsExtras.organization}
                    teamMembers={settingsExtras.teamMembers}
                    verificationLinks={settingsExtras.verificationLinks}
                  />}
                </section>
              </FadeInSection>
            ),
          },

          {
            id: "privacy",
            label: "Privacy & support",
            content: (<div className="talent-settings-stack"><ReferralsPanel key={profile.id} accountId={profile.id} username={profile.username} initialCode={params.referral} /><NotificationSettingsSection accountId={profile.id} retryPath="/dashboard/settings?section=privacy" /><BlockedUsersSection accountId={profile.id} /><section className="space-y-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 text-[var(--ui-text)]"><h2 className="text-lg font-semibold">Data & privacy</h2><p>Read how Motiion handles your information or contact support about your account data.</p><div className="flex flex-wrap gap-3"><a href="/privacy" className="ui-button ui-button--secondary">Privacy policy</a><a href="mailto:support@motiion.io" className="ui-button ui-button--secondary">Contact support</a></div></section></div>),
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
