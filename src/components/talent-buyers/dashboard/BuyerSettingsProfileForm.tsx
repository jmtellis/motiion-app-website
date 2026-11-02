"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  updateBuyerProfile,
  updateBuyerVerificationLinks,
} from "@/app/(buyer-app)/dashboard/settings/actions";
import { AuthButton, AuthMuted } from "@/components/auth/ui";
import { roleOptions } from "@/lib/talent-buyers/onboarding";
import type {
  BuyerOrganizationInfo,
  BuyerTeamMember,
} from "@/lib/talent-buyers/buyer-settings";
import type { DashboardProfile } from "@/types/database";
import type {
  TalentBuyerRole,
  TalentBuyerVerificationLinks,
} from "@/types/talent-buyers";

import { IndustryCard, IndustryField, IndustryInput } from "./IndustryUI";

import { useToast } from "./ToastProvider";

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
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markets = profile.markets?.join(", ") ?? "";
  const isDashboard = variant === "dashboard";
  const wrapperClass = isDashboard
    ? "industry-card industry-settings-form space-y-5 p-5"
    : "ui-card space-y-5 p-5";
  const selectClass = isDashboard
    ? "w-full rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-white/35 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none"
    : "w-full rounded-full border border-[var(--line)] bg-[var(--surface-card)] px-3 py-3 text-sm text-[var(--ink)] outline-none focus:border-[rgb(17_17_17_/_0.35)]";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roleValue = String(form.get("buyerRole") ?? "");

    startTransition(async () => {
      setError(null);
      try {
      const result = await updateBuyerProfile({
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? "").trim() || undefined,
        buyerRole: (roleValue || null) as TalentBuyerRole | null,
        customRole: String(form.get("customRole") ?? ""),
        markets: String(form.get("markets") ?? "").split(",").map(value => value.trim()).filter(Boolean),
        organizationName: String(form.get("organizationName") ?? ""),
        organizationWebsite: String(form.get("organizationWebsite") ?? ""),
      });

      if (result.ok) {
        setIsDirty(false);
        showToast({
          message: result.message ?? "Profile saved",
          variant: "success",
        });
        router.refresh();
      } else {
        setError(result.error ?? "Could not save profile.");
        showToast({
          message: result.error ?? "Could not save profile.",
          variant: "error",
        });
      }
      } catch { setError("Couldn’t save your profile. Your changes are still here; please try again."); }
    });
  }

  return (
    <form
      className={wrapperClass}
      onSubmit={handleSubmit}
      onChange={() => setIsDirty(true)}
      onReset={() => setIsDirty(false)}
    >
      <fieldset disabled={isPending} className="industry-form-grid">
        <IndustryField label="Full name">
          <IndustryInput
            name="fullName"
            defaultValue={profile.fullName}
            placeholder="Your name"
            required
          />
        </IndustryField>
        <IndustryField label="Work email">
          <IndustryInput
            name="email"
            type="email"
            defaultValue={profile.workEmail ?? profile.email ?? ""}
            placeholder="you@company.com"
          />
        </IndustryField>
        <IndustryField label="Organization">
          <IndustryInput
            name="organizationName"
            defaultValue={profile.organizationName ?? profile.companyName ?? ""}
            placeholder="Organization name"
          />
        </IndustryField>
        <IndustryField label="Organization website">
          <IndustryInput
            name="organizationWebsite"
            type="text"
            inputMode="url"
            defaultValue={profile.organizationWebsite ?? ""}
            placeholder="https://"
          />
        </IndustryField>
        <IndustryField label="Title">
          <select
            name="buyerRole"
            defaultValue={profile.buyerRole ?? ""}
            className={selectClass}
          >
            <option value="">Select a title</option>
            {profile.buyerRole && !roleOptions.some(option => option.value === profile.buyerRole) && <option value={profile.buyerRole}>{profile.buyerRole.replaceAll("_", " ")}</option>}
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </IndustryField>
        <IndustryField label="Your role (if Other)"><IndustryInput name="customRole" defaultValue={profile.customRole ?? ""} maxLength={200} placeholder="Your professional title" /></IndustryField>
        <IndustryField label="Markets (separate with commas)">
          <IndustryInput
            name="markets"
            defaultValue={markets}
            placeholder="Los Angeles, New York City"
          />
        </IndustryField>
      </fieldset>

      <AuthMuted>Your work email is a contact address. Manage your sign-in email separately below.</AuthMuted>
      {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}

      <div
        className={`industry-save-bar flex flex-wrap items-center gap-3 pt-2${isDirty ? " industry-save-bar--dirty" : ""}`}
      >
        {isDirty && <span role="status">Unsaved changes</span>}
        {isDirty && (
          <button
            type="reset"
            disabled={isPending}
            className="bd-btn-secondary"
          >
            Discard
          </button>
        )}
        <AuthButton type="submit" disabled={isPending || !isDirty}>
          {isPending ? "Saving…" : "Save changes"}
        </AuthButton>
      </div>
    </form>
  );
}

export function BuyerSettingsWorkspaceSections({
  organization,
  teamMembers,
  verificationLinks,
}: {
  organization: BuyerOrganizationInfo | null;
  teamMembers: BuyerTeamMember[];
  verificationLinks: TalentBuyerVerificationLinks | null;
}) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [website, setWebsite] = useState(
    verificationLinks?.companyWebsite ?? "",
  );
  const [linkedin, setLinkedin] = useState(verificationLinks?.linkedin ?? "");
  const [instagram, setInstagram] = useState(
    verificationLinks?.instagram ?? "",
  );

  function perform(action: () => Promise<void>) {
    startTransition(async () => {
      try { await action(); }
      catch { showToast({ message: "Couldn’t save your changes. Please try again.", variant: "error" }); }
    });
  }

  function saveVerification() {
    perform(async () => {
      const result = await updateBuyerVerificationLinks({
        companyWebsite: website.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        instagram: instagram.trim() || undefined,
      });
      showToast(
        result.ok
          ? { message: "Verification links saved", variant: "success" }
          : {
              message: result.error ?? "Could not save links.",
              variant: "error",
            },
      );
    });
  }

  const inputClass =
    "w-full rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-white/35 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none";

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <IndustryCard className="px-5 py-5">
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
                  <a
                    href={organization.website}
                    className="text-[var(--accent)] hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {organization.website}
                  </a>
                </dd>
              </div>
            ) : null}
            {organization.type ? (
              <div>
                <dt className="text-white/45">Type</dt>
                <dd className="font-medium text-white/85 capitalize">
                  {organization.type.replace(/_/g, " ")}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-white/50">
            Add an organization name in the Account section.
          </p>
        )}
      </IndustryCard>

      <IndustryCard className="px-5 py-5">
        <h3 className="text-base font-semibold text-white/92">Team Members</h3>
        {teamMembers.length ? (
          <ul className="mt-3 space-y-2">
            {teamMembers.map((member) => (
              <li
                key={member.userId}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div>
                  <p className="font-medium text-white/85">{member.name}</p>
                  {member.email ? (
                    <p className="text-white/45">{member.email}</p>
                  ) : null}
                </div>
                <span className="bd-chip px-2 py-0.5 text-[10px] uppercase">
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-white/50">
            No organization team members yet. Manage project collaborators within each project.
          </p>
        )}
      </IndustryCard>

      <IndustryCard className="space-y-3 px-5 py-5">
        <h3 className="text-base font-semibold text-white/92">Professional links</h3>
        <p className="text-sm text-white/60">Links support your professional profile. Identity verification and industry approval are managed separately.</p>
        <IndustryField label="Website">
          <IndustryInput
            type="url"
            className={inputClass}
            placeholder="Website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </IndustryField>
        <IndustryField label="LinkedIn URL">
          <IndustryInput
            type="url"
            className={inputClass}
            placeholder="LinkedIn URL"
            value={linkedin}
            onChange={(event) => setLinkedin(event.target.value)}
          />
        </IndustryField>
        <IndustryField label="Instagram URL">
          <IndustryInput
            type="url"
            className={inputClass}
            placeholder="Instagram URL"
            value={instagram}
            onChange={(event) => setInstagram(event.target.value)}
          />
        </IndustryField>
        <button
          type="button"
          className="bd-btn-secondary"
          disabled={isPending}
          onClick={saveVerification}
        >
          Save links
        </button>
      </IndustryCard>
    </div>
  );
}
