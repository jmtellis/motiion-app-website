"use client";

import { AuthButton, AuthField, AuthInput, AuthMuted } from "@/components/auth/ui";
import { roleOptions } from "@/lib/talent-buyers/onboarding";
import type { DashboardProfile } from "@/types/database";

import { SignOutButton } from "./SignOutButton";

function roleLabel(role: DashboardProfile["buyerRole"]) {
  if (!role) return "";
  const match = roleOptions.find((option) => option.value === role);
  return match?.label ?? role;
}

export function BuyerSettingsProfileForm({
  profile,
  variant = "default",
}: {
  profile: DashboardProfile;
  variant?: "default" | "dashboard";
}) {
  const markets = profile.markets?.join(", ") ?? "";
  const isDashboard = variant === "dashboard";
  const wrapperClass = isDashboard ? "bd-muted-panel space-y-5 p-5" : "ui-card space-y-5 p-5";

  return (
    <div className={wrapperClass}>
      <div className="space-y-4">
        <AuthField label="Full name">
          <AuthInput name="fullName" defaultValue={profile.fullName} placeholder="Your name" />
        </AuthField>
        <AuthField label="Work email">
          <AuthInput name="email" type="email" defaultValue={profile.email ?? ""} readOnly disabled />
        </AuthField>
        <AuthField label="Organization">
          <AuthInput
            name="organizationName"
            defaultValue={profile.organizationName ?? profile.companyName ?? ""}
            placeholder="Organization name"
          />
        </AuthField>
        <AuthField label="Organization website">
          <AuthInput
            name="organizationWebsite"
            type="url"
            defaultValue={profile.organizationWebsite ?? ""}
            placeholder="https://"
          />
        </AuthField>
        <AuthField label="Role">
          <AuthInput name="role" defaultValue={roleLabel(profile.buyerRole)} readOnly disabled />
        </AuthField>
        <AuthField label="Markets">
          <AuthInput name="markets" defaultValue={markets} readOnly disabled placeholder="Markets from onboarding" />
        </AuthField>
      </div>

      <AuthMuted>Profile updates will sync to your account soon.</AuthMuted>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <AuthButton type="button" disabled className="opacity-60">
          Save changes
        </AuthButton>
        <SignOutButton />
      </div>
    </div>
  );
}
