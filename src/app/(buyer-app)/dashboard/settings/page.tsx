import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { BuyerBillingSection } from "@/components/talent-buyers/dashboard/BuyerBillingSection";
import { BuyerSettingsProfileForm } from "@/components/talent-buyers/dashboard/BuyerSettingsProfileForm";
import { DeleteBuyerAccountButton } from "@/components/talent-buyers/dashboard/DeleteBuyerAccountButton";
import { PageHeader } from "@/components/talent-buyers/dashboard/PageHeader";
import { SectionHeader } from "@/components/talent-buyers/dashboard/SectionHeader";
import { requireHiringAccount } from "@/lib/auth/session";
import { getUserEntitlement } from "@/lib/billing/entitlement";

const settingsSections = [
  "Organization",
  "Team Members",
  "Verification",
  "Notifications",
] as const;

export default async function BuyerSettingsPage() {
  const profile = await requireHiringAccount();
  const entitlement = await getUserEntitlement(profile.id);

  return (
    <BuyerAppPage>
      <PageHeader
        variant="dashboard"
        eyebrow="Settings"
        title="Settings"
        description="Edit your account details and manage workspace preferences."
      />

      <section className="bd-page-section space-y-4">
        <SectionHeader title="Account" description="Your profile and sign-in details." size="dashboard" />
        <BuyerSettingsProfileForm profile={profile} variant="dashboard" />
      </section>

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

      <section className="bd-page-section space-y-4">
        <SectionHeader title="Workspace settings" size="dashboard" />
        <div className="grid gap-3 md:grid-cols-2">
          {settingsSections.map((section) => (
            <div key={section} className="bd-muted-panel px-5 py-5">
              <h3 className="text-base font-semibold text-white/92">{section}</h3>
              <p className="mt-2 text-sm text-white/50">Coming soon.</p>
            </div>
          ))}
        </div>
      </section>
    </BuyerAppPage>
  );
}
