import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { SettingsAdminAnalyticsSection } from "@/components/settings/SettingsAdminAnalyticsSection";
import { TalentAccountForm } from "@/components/settings/TalentAccountForm";
import { TalentAdminPanel } from "@/components/settings/TalentAdminPanel";
import { TalentResourcesPanel } from "@/components/settings/TalentResourcesPanel";
import { TalentVerificationPanel } from "@/components/settings/TalentVerificationPanel";
import { IndustryPageHeader } from "@/components/talent-buyers/dashboard/IndustryUI";
import { IndustrySettings } from "@/components/talent-buyers/dashboard/IndustrySettings";
import { isPlatformAdmin, requireCompleteProfile } from "@/lib/auth/session";
import { getActiveShell } from "@/lib/auth/profile";
import { fetchKpiDashboard } from "@/lib/analytics/kpi-queries";
import type { KpiMetric } from "@/lib/analytics/kpi-types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  loadCreditAttributions,
  loadCreditClaims,
  loadProfilesToReview,
  loadTalentPlan,
  reconcileIdentityFee,
  syncTalentIdentityVerification,
} from "./work-actions";

type AccountRow = {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  date_of_birth: string | null;
  email: string | null;
  contact_email: string | null;
  member_number: number | string | null;
  is_private: boolean | null;
  resume_url: string | null;
  identity_verification_status: string | null;
  talent_types: string[] | null;
};

const sections = new Set(["account", "verification", "resources", "admin"]);

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    section?: string;
    identity?: string;
    identityFee?: string;
    session_id?: string;
    connect?: string;
  }>;
}) {
  const profile = await requireCompleteProfile();
  if (getActiveShell(profile) === "lookingForTalent") redirect("/dashboard/settings");

  const params = await searchParams;
  if (params.identityFee === "success" && params.session_id) {
    await reconcileIdentityFee(params.session_id);
  } else if (params.identity === "return") {
    await syncTalentIdentityVerification();
  }

  const supabase = await createServerSupabaseClient();
  const accountQuery = await supabase
    ?.from("profiles")
    .select(
      "first_name, last_name, username, date_of_birth, email, contact_email, member_number, is_private, resume_url, identity_verification_status, talent_types",
    )
    .eq("user_id", profile.id)
    .maybeSingle<AccountRow>();

  const account = accountQuery?.data;
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  const canChangePassword = Boolean(user?.identities?.some((identity) => identity.provider === "email"));
  const isCommunity = profile.accountType === "community";
  const isChoreographer = (account?.talent_types ?? profile.talentTypes ?? []).some(
    (type) => type.trim().toLowerCase() === "choreographer",
  );
  const admin = await isPlatformAdmin();
  const plan = await loadTalentPlan();
  const [attributions, claims] = isCommunity
    ? [[], []]
    : await Promise.all([loadCreditAttributions(), isChoreographer ? loadCreditClaims() : Promise.resolve([])]);

  let metrics: KpiMetric[] = [];
  let reviews: Awaited<ReturnType<typeof loadProfilesToReview>> = { ok: true, items: [] };
  if (admin) {
    try {
      metrics = (await fetchKpiDashboard()).executiveMetrics;
    } catch {
      metrics = [];
    }
    reviews = await loadProfilesToReview();
  }

  const requested = params.section && sections.has(params.section) ? params.section : "account";
  const initialSection = requested === "verification" && isCommunity ? "account" : requested === "admin" && !admin ? "account" : requested;
  const profileLabel = isCommunity ? "community profile" : "talent profile";
  const settingsSections = [
    {
      id: "account",
      label: "Account",
      content: (
        <div className="talent-settings-stack">
          {admin ? <SettingsAdminAnalyticsSection variant="talent" /> : null}
          <TalentAccountForm
            firstName={account?.first_name ?? ""}
            lastName={account?.last_name ?? ""}
            username={account?.username ?? profile.username ?? ""}
            dateOfBirth={account?.date_of_birth?.slice(0, 10) ?? ""}
            email={account?.email ?? profile.email ?? ""}
            contactEmail={account?.contact_email ?? ""}
            memberNumber={account?.member_number == null ? null : String(account.member_number)}
            isPrivate={account?.is_private === true}
            canChangePassword={canChangePassword}
            profileLabel={profileLabel}
          />
        </div>
      ),
    },
  ];

  if (!isCommunity) {
    settingsSections.push({
      id: "verification",
      label: "Verification",
      content: (
        <TalentVerificationPanel
          resumeUrl={account?.resume_url ?? null}
          identityStatus={account?.identity_verification_status ?? "unverified"}
          attributions={attributions}
          claims={claims}
          showCreditClaims={isChoreographer}
          connectReturn={params.connect === "return"}
        />
      ),
    });
  }

  settingsSections.push({
    id: "resources",
    label: "Privacy & support",
    content: (
      <TalentResourcesPanel planLabel={plan.label} canManageBilling={plan.canManageBilling} />
    ),
  });

  if (admin) {
    settingsSections.push({
      id: "admin",
      label: "Admin",
      content: (
        <TalentAdminPanel
          metrics={metrics}
          reviews={reviews.ok ? reviews.items : []}
          reviewError={reviews.ok ? null : reviews.error}
        />
      ),
    });
  }

  return (
    <AppShell profile={profile}>
      <div className="space-y-6">
        <IndustryPageHeader
          title="Settings"
          description="Your account, verification, subscription, and support."
        />
        <IndustrySettings sections={settingsSections} initialSection={initialSection} />
      </div>
    </AppShell>
  );
}
