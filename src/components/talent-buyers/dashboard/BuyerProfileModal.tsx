"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  updateBuyerAvatar,
  updateBuyerProfile,
} from "@/app/(buyer-app)/dashboard/settings/actions";
import { getProfileInitials } from "@/lib/auth/avatar";
import { resizeImageFile } from "@/lib/onboarding/client-media";
import { roleOptions } from "@/lib/talent-buyers/onboarding";
import type { DashboardProfile } from "@/types/database";
import type { TalentBuyerRole } from "@/types/talent-buyers";

import { Modal } from "./Modal";
import { SignOutButton } from "./SignOutButton";
import { useToast } from "./ToastProvider";

function roleLabel(role: DashboardProfile["buyerRole"]) {
  if (!role) return "";
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

const fieldClass =
  "w-full rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-white/35 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none disabled:opacity-55";

type BuyerProfileModalProps = { open: boolean; onClose: () => void; profile: DashboardProfile };
export function BuyerProfileModal(props: BuyerProfileModalProps) {
  return props.open ? <BuyerProfileModalContent key={props.profile.id} {...props} /> : null;
}

function BuyerProfileModalContent({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: DashboardProfile;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.workEmail ?? profile.email ?? "");
  const [buyerRole, setBuyerRole] = useState<TalentBuyerRole | "">(profile.buyerRole ?? "");
  const [organizationName, setOrganizationName] = useState(
    profile.organizationName ?? profile.companyName ?? "",
  );
  const [organizationWebsite, setOrganizationWebsite] = useState(profile.organizationWebsite ?? "");
  const [companyWebsite, setCompanyWebsite] = useState(
    profile.verificationLinks?.companyWebsite ?? "",
  );
  const [linkedin, setLinkedin] = useState(profile.verificationLinks?.linkedin ?? "");
  const [instagram, setInstagram] = useState(profile.verificationLinks?.instagram ?? "");
  const [customRole, setCustomRole] = useState(profile.customRole ?? "");
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? null);


  const initials = getProfileInitials(fullName || profile.fullName);
  const markets = profile.markets?.filter(Boolean) ?? [];
  const subtitle = roleLabel(buyerRole || profile.buyerRole) || "Industry professional";

  const dirty = fullName !== profile.fullName || email !== (profile.workEmail ?? profile.email ?? "") || buyerRole !== (profile.buyerRole ?? "") || customRole !== (profile.customRole ?? "") || organizationName !== (profile.organizationName ?? profile.companyName ?? "") || organizationWebsite !== (profile.organizationWebsite ?? "") || companyWebsite !== (profile.verificationLinks?.companyWebsite ?? "") || linkedin !== (profile.verificationLinks?.linkedin ?? "") || instagram !== (profile.verificationLinks?.instagram ?? "");
  function requestClose() { if (isPending || isUploadingAvatar) return; if (dirty) setDiscardPrompt(true); else onClose(); }
  function handleSave() {
    startTransition(async () => {
      setError(null);
      try {
      const result = await updateBuyerProfile({
        fullName,
        email: email.trim() || undefined,
        buyerRole: buyerRole || null,
        customRole,
        organizationName,
        organizationWebsite,
        verificationLinks: {
          companyWebsite: companyWebsite.trim() || undefined,
          linkedin: linkedin.trim() || undefined,
          instagram: instagram.trim() || undefined,
        },
      });

      if (!result.ok) {
        setError(result.error ?? "Could not save profile.");
        showToast({ message: result.error ?? "Could not save profile.", variant: "error" });
        return;
      }

      showToast({
        message: result.message ?? "Profile saved",
        variant: "success",
      });
      router.refresh();
      onClose();
      } catch { setError("Couldn’t save your profile. Your changes are still here; please retry."); }
    });
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    setIsUploadingAvatar(true);

    startTransition(async () => {
      try {
        const blob = await resizeImageFile(file);
        const prepared = new File([blob], file.name.replace(/\.\w+$/, ".jpg") || "avatar.jpg", {
          type: "image/jpeg",
        });

        const formData = new FormData();
        formData.set("file", prepared);

        const result = await updateBuyerAvatar(formData);
        if (!result.ok) {
          setAvatarUrl(profile.avatarUrl ?? null);
          showToast({ message: result.error ?? "Could not update photo.", variant: "error" });
          return;
        }

        setAvatarUrl(result.avatarUrl);
        showToast({ message: "Profile photo updated", variant: "success" });
        router.refresh();
      } catch (error) {
        setAvatarUrl(profile.avatarUrl ?? null);
        showToast({
          message: error instanceof Error ? error.message : "Could not update photo.",
          variant: "error",
        });
      } finally {
        setIsUploadingAvatar(false);
        URL.revokeObjectURL(previewUrl);
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title="Your profile"
      description="Update how you appear when casting and contacting talent."
      size="lg"
      placement="drawer"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SignOutButton className="btn-outline text-sm bd-btn-secondary" />
            <Link
              href="/dashboard/settings"
              className="text-sm text-white/55 transition hover:text-white/85"
              onClick={event => { if (dirty) { event.preventDefault(); requestClose(); } else onClose(); }}
            >
              Account settings
            </Link>
          </div>
          <button
            type="button"
            className="bd-btn-accent"
            disabled={isPending || isUploadingAvatar || !dirty}
            onClick={handleSave}
          >
            {isPending && !isUploadingAvatar ? "Saving…" : "Save changes"}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {discardPrompt && <div className="rounded-xl border border-[var(--line)] p-4" role="alert"><p className="font-medium">Discard your unsaved changes?</p><p className="mt-1 text-sm text-white/65">Your uploaded photo is already saved. Other changes have not been saved.</p><div className="mt-3 flex gap-3"><button type="button" className="bd-btn-secondary" onClick={() => setDiscardPrompt(false)}>Keep editing</button><button type="button" className="bd-btn-secondary" onClick={onClose}>Discard changes</button></div></div>}
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative size-20 shrink-0 overflow-hidden rounded-full bg-[var(--buyer-accent-fill)] ring-1 ring-white/15 transition hover:ring-white/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo"
            disabled={isUploadingAvatar}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
                onError={() => setAvatarUrl(null)}
              />
            ) : (
              <span className="flex size-full items-center justify-center text-lg font-semibold tracking-wide text-white/90">
                {initials || "?"}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-[10px] font-medium uppercase tracking-wide text-white/90">
              <Camera className="size-3" aria-hidden />
              {isUploadingAvatar ? "…" : "Edit"}
            </span>
          </button>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white/95">{fullName || "Your name"}</p>
            <p className="truncate text-sm text-white/55">{subtitle}</p>
            <button
              type="button"
              className="mt-2 text-sm text-[var(--accent)] transition hover:text-[color-mix(in_oklab,var(--accent),white_20%)]"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? "Uploading photo…" : "Change photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-xs font-medium uppercase tracking-wide text-white/45">Full name</span>
            <input
              className={fieldClass}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your name"
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-white/45">Title</span>
            <select
              className={fieldClass}
              value={buyerRole}
              onChange={(event) => setBuyerRole(event.target.value as TalentBuyerRole | "")}
            >
              <option value="">Select a title</option>
              {profile.buyerRole && !roleOptions.some(option => option.value === profile.buyerRole) && <option value={profile.buyerRole}>{profile.buyerRole.replaceAll("_", " ")}</option>}
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-white/45">Work contact email</span>
            <input
              className={fieldClass}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-white/45">Organization</span>
            <input
              className={fieldClass}
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Organization name"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-white/45">
              Organization website
            </span>
            <input
              className={fieldClass}
              type="url"
              value={organizationWebsite}
              onChange={(event) => setOrganizationWebsite(event.target.value)}
              placeholder="https://"
            />
          </label>
        </div>

        {buyerRole === "other" && <label className="block space-y-1.5"><span className="text-sm">Your professional role</span><input className={fieldClass} value={customRole} onChange={event => setCustomRole(event.target.value)} maxLength={200} /></label>}
        <p className="text-sm text-white/65">Work contact email is separate from your sign-in email. Photos save immediately.</p>
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-white/45">Professional links</p>
          <div className="grid gap-3 sm:grid-cols-1">
            <input
              className={fieldClass}
              type="url"
              value={companyWebsite}
              onChange={(event) => setCompanyWebsite(event.target.value)}
              aria-label="Professional website"
              placeholder="Website"
            />
            <input
              className={fieldClass}
              type="url"
              value={linkedin}
              onChange={(event) => setLinkedin(event.target.value)}
              aria-label="LinkedIn URL"
              placeholder="LinkedIn URL"
            />
            <input
              className={fieldClass}
              type="url"
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
              aria-label="Instagram URL"
              placeholder="Instagram URL"
            />
          </div>
        </div>

        {markets.length ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-white/45">Markets</p>
            <div className="flex flex-wrap gap-2">
              {markets.map((market) => (
                <span key={market} className="bd-chip px-2.5 py-1 text-[11px]">
                  {market}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
