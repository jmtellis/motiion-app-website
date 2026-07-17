"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

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
  "w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-white/30 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none disabled:opacity-55";

export function BuyerProfileModal({
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
  const [email, setEmail] = useState(profile.email ?? "");
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
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? null);

  useEffect(() => {
    if (!open) return;
    setFullName(profile.fullName);
    setEmail(profile.email ?? "");
    setBuyerRole(profile.buyerRole ?? "");
    setOrganizationName(profile.organizationName ?? profile.companyName ?? "");
    setOrganizationWebsite(profile.organizationWebsite ?? "");
    setCompanyWebsite(profile.verificationLinks?.companyWebsite ?? "");
    setLinkedin(profile.verificationLinks?.linkedin ?? "");
    setInstagram(profile.verificationLinks?.instagram ?? "");
    setAvatarUrl(profile.avatarUrl ?? null);
  }, [open, profile]);

  const initials = getProfileInitials(fullName || profile.fullName);
  const markets = profile.markets?.filter(Boolean) ?? [];
  const subtitle = roleLabel(buyerRole || profile.buyerRole) || "Industry professional";

  function handleSave() {
    startTransition(async () => {
      const result = await updateBuyerProfile({
        fullName,
        email: email.trim() || undefined,
        buyerRole: buyerRole || null,
        organizationName,
        organizationWebsite,
        verificationLinks: {
          companyWebsite: companyWebsite.trim() || undefined,
          linkedin: linkedin.trim() || undefined,
          instagram: instagram.trim() || undefined,
        },
      });

      if (!result.ok) {
        showToast({ message: result.error ?? "Could not save profile.", variant: "error" });
        return;
      }

      showToast({
        message: result.message ?? "Profile saved",
        variant: "success",
      });
      router.refresh();
      onClose();
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
      onClose={onClose}
      title="Your profile"
      description="Update how you appear when casting and contacting talent."
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SignOutButton className="bd-btn-secondary" />
            <Link
              href="/dashboard/settings"
              className="text-sm text-white/55 transition hover:text-white/85"
              onClick={onClose}
            >
              Account settings
            </Link>
          </div>
          <button
            type="button"
            className="bd-btn-accent"
            disabled={isPending || isUploadingAvatar}
            onClick={handleSave}
          >
            {isPending && !isUploadingAvatar ? "Saving…" : "Save changes"}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative size-20 shrink-0 overflow-hidden rounded-full bg-[#0c2a26] ring-1 ring-white/15 transition hover:ring-white/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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
              className="mt-2 text-sm text-[#2dd4bf] transition hover:text-[#5eead4]"
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
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-white/45">Email</span>
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

        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-white/45">Professional links</p>
          <div className="grid gap-3 sm:grid-cols-1">
            <input
              className={fieldClass}
              type="url"
              value={companyWebsite}
              onChange={(event) => setCompanyWebsite(event.target.value)}
              placeholder="Website"
            />
            <input
              className={fieldClass}
              type="url"
              value={linkedin}
              onChange={(event) => setLinkedin(event.target.value)}
              placeholder="LinkedIn URL"
            />
            <input
              className={fieldClass}
              type="url"
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
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
