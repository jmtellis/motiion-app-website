"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  updateBuyerNotificationPreferences,
  updateBuyerProfile,
  updateBuyerVerificationLinks,
} from "@/app/(buyer-app)/dashboard/settings/actions";
import { AuthButton, AuthField, AuthInput, AuthMuted } from "@/components/auth/ui";
import { roleOptions } from "@/lib/talent-buyers/onboarding";
import type {
  BuyerOrganizationInfo,
  BuyerTeamMember,
} from "@/lib/talent-buyers/buyer-settings";
import type { DashboardProfile } from "@/types/database";
import type {
  TalentBuyerNotificationPreferences,
  TalentBuyerRole,
  TalentBuyerVerificationLinks,
} from "@/types/talent-buyers";

import { useToast } from "./ToastProvider";
import { SignOutButton } from "./SignOutButton";

export function BuyerSettingsProfileForm({
  profile,
  variant = "default",
}: {
  profile: DashboardProfile;
  variant?: "default" | "dashboard";
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const markets = profile.markets?.join(", ") ?? "";
  const isDashboard = variant === "dashboard";
  const wrapperClass = isDashboard ? "bd-muted-panel space-y-5 p-5" : "ui-card space-y-5 p-5";
  const selectClass = isDashboard
    ? "w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-white/30 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none"
    : "w-full rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface-card)] px-3 py-3 text-sm text-[var(--ink)] outline-none";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roleValue = String(form.get("buyerRole") ?? "");

    startTransition(async () => {
      const result = await updateBuyerProfile({
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? "").trim() || undefined,
        buyerRole: (roleValue || null) as TalentBuyerRole | null,
        organizationName: String(form.get("organizationName") ?? ""),
        organizationWebsite: String(form.get("organizationWebsite") ?? ""),
      });

      if (result.ok) {
        showToast({
          message: result.message ?? "Profile saved",
          variant: "success",
        });
        router.refresh();
      } else {
        showToast({ message: result.error ?? "Could not save profile.", variant: "error" });
      }
    });
  }

  return (
    <form className={wrapperClass} onSubmit={handleSubmit}>
      <div className="space-y-4">
        <AuthField label="Full name">
          <AuthInput name="fullName" defaultValue={profile.fullName} placeholder="Your name" required />
        </AuthField>
        <AuthField label="Work email">
          <AuthInput name="email" type="email" defaultValue={profile.email ?? ""} placeholder="you@company.com" />
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
        <AuthField label="Title">
          <select
            name="buyerRole"
            defaultValue={profile.buyerRole ?? ""}
            className={selectClass}
          >
            <option value="">Select a title</option>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </AuthField>
        <AuthField label="Markets">
          <AuthInput name="markets" defaultValue={markets} readOnly disabled placeholder="Markets from onboarding" />
        </AuthField>
      </div>

      <AuthMuted>Changes sync to your Motiion account immediately.</AuthMuted>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <AuthButton type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </AuthButton>
        <SignOutButton />
      </div>
    </form>
  );
}

export function BuyerSettingsWorkspaceSections({
  organization,
  teamMembers,
  notificationPreferences,
  verificationLinks,
}: {
  organization: BuyerOrganizationInfo | null;
  teamMembers: BuyerTeamMember[];
  notificationPreferences: TalentBuyerNotificationPreferences | null;
  verificationLinks: TalentBuyerVerificationLinks | null;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [newTalentMatches, setNewTalentMatches] = useState(
    notificationPreferences?.newTalentMatches ?? true,
  );
  const [opportunityUpdates, setOpportunityUpdates] = useState(
    notificationPreferences?.opportunityUpdates ?? true,
  );
  const [industryAnnouncements, setIndustryAnnouncements] = useState(
    notificationPreferences?.industryAnnouncements ?? false,
  );
  const [website, setWebsite] = useState(verificationLinks?.companyWebsite ?? "");
  const [linkedin, setLinkedin] = useState(verificationLinks?.linkedin ?? "");
  const [instagram, setInstagram] = useState(verificationLinks?.instagram ?? "");

  function saveNotifications() {
    startTransition(async () => {
      const result = await updateBuyerNotificationPreferences({
        newTalentMatches,
        opportunityUpdates,
        industryAnnouncements,
      });
      showToast(
        result.ok
          ? { message: "Notification preferences saved", variant: "success" }
          : { message: result.error ?? "Could not save preferences.", variant: "error" },
      );
    });
  }

  function saveVerification() {
    startTransition(async () => {
      const result = await updateBuyerVerificationLinks({
        companyWebsite: website.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        instagram: instagram.trim() || undefined,
      });
      showToast(
        result.ok
          ? { message: "Verification links saved", variant: "success" }
          : { message: result.error ?? "Could not save links.", variant: "error" },
      );
    });
  }

  const inputClass =
    "w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-white/30 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none";

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="bd-muted-panel px-5 py-5">
        <h3 className="text-base font-semibold text-white/92">Organization</h3>
        {organization ? (
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-white/45">Name</dt>
              <dd className="font-medium text-white/85">{organization.name}</dd>
            </div>
            {organization.website ? (
              <div>
                <dt className="text-white/45">Website</dt>
                <dd>
                  <a href={organization.website} className="text-[#2dd4bf] hover:underline" target="_blank" rel="noreferrer">
                    {organization.website}
                  </a>
                </dd>
              </div>
            ) : null}
            {organization.type ? (
              <div>
                <dt className="text-white/45">Type</dt>
                <dd className="font-medium text-white/85 capitalize">{organization.type.replace(/_/g, " ")}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-white/50">Add an organization name in your account profile above.</p>
        )}
      </div>

      <div className="bd-muted-panel px-5 py-5">
        <h3 className="text-base font-semibold text-white/92">Team Members</h3>
        {teamMembers.length ? (
          <ul className="mt-3 space-y-2">
            {teamMembers.map((member) => (
              <li key={member.userId} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-white/85">{member.name}</p>
                  {member.email ? <p className="text-white/45">{member.email}</p> : null}
                </div>
                <span className="bd-chip px-2 py-0.5 text-[10px] uppercase">{member.role}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-white/50">Team invites are coming soon. Your organization workspace will list collaborators here.</p>
        )}
      </div>

      <div className="bd-muted-panel space-y-4 px-5 py-5">
        <h3 className="text-base font-semibold text-white/92">Notifications</h3>
        <label className="flex items-center justify-between gap-3 text-sm text-white/75">
          New talent matches
          <input
            type="checkbox"
            checked={newTalentMatches}
            onChange={(event) => setNewTalentMatches(event.target.checked)}
            className="size-4 rounded border-white/20 bg-transparent accent-[#2dd4bf]"
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-white/75">
          Opportunity updates
          <input
            type="checkbox"
            checked={opportunityUpdates}
            onChange={(event) => setOpportunityUpdates(event.target.checked)}
            className="size-4 rounded border-white/20 bg-transparent accent-[#2dd4bf]"
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-white/75">
          Industry announcements
          <input
            type="checkbox"
            checked={industryAnnouncements}
            onChange={(event) => setIndustryAnnouncements(event.target.checked)}
            className="size-4 rounded border-white/20 bg-transparent accent-[#2dd4bf]"
          />
        </label>
        <button type="button" className="bd-btn-secondary" disabled={isPending} onClick={saveNotifications}>
          Save preferences
        </button>
      </div>

      <div className="bd-muted-panel space-y-3 px-5 py-5">
        <h3 className="text-base font-semibold text-white/92">Verification</h3>
        <input
          type="url"
          className={inputClass}
          placeholder="Website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
        <input
          type="url"
          className={inputClass}
          placeholder="LinkedIn URL"
          value={linkedin}
          onChange={(event) => setLinkedin(event.target.value)}
        />
        <input
          type="url"
          className={inputClass}
          placeholder="Instagram URL"
          value={instagram}
          onChange={(event) => setInstagram(event.target.value)}
        />
        <button type="button" className="bd-btn-secondary" disabled={isPending} onClick={saveVerification}>
          Save links
        </button>
      </div>
    </div>
  );
}
