"use server";

import { revalidatePath } from "next/cache";
import { checkAccountDeletionBilling } from "@/lib/billing/account-deletion";
import type { AccountDeletionResult } from "@/lib/billing/account-deletion-state";
import type { z } from "zod";
import { buyerProfileEditSchema, buyerVerificationLinksSchema } from "@/lib/talent-buyers/profile-edit";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildAuthDisplayNameMetadata, isHiringAccount } from "@/lib/auth/profile";
import { mapBuyerRoleToLegacyNonTalentType } from "@/lib/talent-buyers/roles";
import type {
  TalentBuyerRole,
  TalentBuyerVerificationLinks,
} from "@/types/talent-buyers";

export type DeleteBuyerAccountResult = AccountDeletionResult;

const updateProfileSchema = buyerProfileEditSchema;

export type UpdateBuyerProfileInput = z.infer<typeof updateProfileSchema>;

export type UpdateBuyerProfileResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const AVATARS_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 12 * 1024 * 1024;

function revalidateBuyerProfilePaths() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/profile/[slug]", "page");
  revalidatePath("/", "layout");
}

export async function updateBuyerProfile(
  input: UpdateBuyerProfileInput,
): Promise<UpdateBuyerProfileResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const parts = parsed.data.fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  const nextEmail = parsed.data.email?.trim().toLowerCase();
  // This is a professional contact address. Sign-in email changes live in Account security.
  const profileUpdate: {
    display_name: string;
    first_name: string;
    last_name: string;
    email?: string;
  } = {
    display_name: parsed.data.fullName.trim(),
    first_name: firstName,
    last_name: lastName,
  };


  const { data: savedProfile, error: profileError } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("user_id", user.id).select("user_id").single();

  if (profileError || !savedProfile) return { ok: false, error: "Couldn’t save your profile. Please try again." };

  const { error: authNameError } = await supabase.auth.updateUser({
    data: buildAuthDisplayNameMetadata({
      firstName,
      lastName,
      displayName: parsed.data.fullName.trim(),
    }),
  });

  const buyerUpdate: {
    organization_name: string | null;
    organization_website: string | null;
    role?: TalentBuyerRole;
    custom_role?: string | null;
    markets?: string[];
    non_talent_type?: string | null;
    verification_links?: TalentBuyerVerificationLinks;
    work_email?: string;
  } = {
    organization_name: parsed.data.organizationName?.trim() || null,
    organization_website: parsed.data.organizationWebsite?.trim() || null,
  };

  if (parsed.data.buyerRole) {
    buyerUpdate.role = parsed.data.buyerRole;
    buyerUpdate.custom_role = parsed.data.buyerRole === "other" ? parsed.data.customRole?.trim() || null : null;
    buyerUpdate.non_talent_type = mapBuyerRoleToLegacyNonTalentType(parsed.data.buyerRole);
  }

  if (parsed.data.markets) buyerUpdate.markets = [...new Set(parsed.data.markets)];

  if (parsed.data.verificationLinks) {
    buyerUpdate.verification_links = {
      companyWebsite: parsed.data.verificationLinks.companyWebsite?.trim() || undefined,
      linkedin: parsed.data.verificationLinks.linkedin?.trim() || undefined,
      instagram: parsed.data.verificationLinks.instagram?.trim() || undefined,
    };
  }

  if (nextEmail) {
    buyerUpdate.work_email = nextEmail;
  }

  const { data: savedBuyer, error: buyerError } = await supabase
    .from("non_talent_profiles")
    .update(buyerUpdate)
    .eq("id", user.id).select("id").single();

  if (buyerError || !savedBuyer) return { ok: false, error: "Your name was saved, but professional details could not be saved. Please retry." };

  revalidateBuyerProfilePaths();

  return { ok: true, ...(authNameError ? { message: "Profile saved. Your sign-in provider’s display name could not be updated." } : {}) };
}

export async function updateBuyerAvatar(
  formData: FormData,
): Promise<{ ok: true; avatarUrl: string } | { ok: false; error: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return { ok: false, error: "Supabase is not configured." };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "You must be signed in." };

    const file = formData.get("file");
    if (!(file instanceof Blob) || file.size === 0) {
      return { ok: false, error: "Choose a profile photo." };
    }

    const contentType = file.type || "image/jpeg";
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      return { ok: false, error: "Profile photo must be an image file." };
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return { ok: false, error: "Profile photo must be under 12 MB." };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const path = `${user.id.toLowerCase()}/industry_${crypto.randomUUID()}.${ext}`;
    const upload = await supabase.storage.from(AVATARS_BUCKET).upload(path, bytes, { contentType, upsert: false });
    if (upload.error) return { ok: false, error: upload.error.message };
    const avatarUrl = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl;
    // A professional avatar is separate from a talent portfolio's headshots.
    const { data: updated, error: profileError } = await supabase.from("profiles").update({ industry_avatar_url: avatarUrl }).eq("user_id", user.id).select("user_id").single();
    if (profileError || !updated) return { ok: false, error: "The photo uploaded, but couldn’t be saved to your profile. Please retry." };

    revalidateBuyerProfilePaths();
    return { ok: true, avatarUrl };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Profile photo upload failed.",
    };
  }
}

export async function updateBuyerVerificationLinks(
  links: TalentBuyerVerificationLinks,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = buyerVerificationLinksSchema.safeParse(links);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your professional links." };
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("non_talent_profiles")
    .update({ verification_links: parsed.data })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function deleteBuyerAccount(): Promise<DeleteBuyerAccountResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to delete your account." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_type, active_shell, enabled_shells")
    .eq("user_id", user.id)
    .maybeSingle<{
      account_type: string | null;
      active_shell: string | null;
      enabled_shells: string[] | null;
    }>();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const enabledShells = profile?.enabled_shells ?? [];
  const industryShell =
    isHiringAccount(profile?.account_type) ||
    profile?.active_shell === "lookingForTalent" ||
    enabledShells.includes("lookingForTalent");
  if (!profile || !industryShell) {
    return { ok: false, error: "Only talent buyer accounts can be deleted from this page." };
  }

  const billing = await checkAccountDeletionBilling(user.id);
  if (!billing.ok) return billing;
  const { error: deleteError } = await supabase.rpc("delete_my_account");
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  await supabase.auth.signOut();

  return { ok: true };
}
