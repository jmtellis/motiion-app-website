"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isHiringAccount } from "@/lib/auth/profile";
import { mapBuyerRoleToLegacyNonTalentType } from "@/lib/talent-buyers/roles";
import type {
  TalentBuyerNotificationPreferences,
  TalentBuyerRole,
  TalentBuyerVerificationLinks,
} from "@/types/talent-buyers";

export type DeleteBuyerAccountResult =
  | { ok: true }
  | { ok: false; error: string };

const talentBuyerRoleSchema = z.enum([
  "casting_director",
  "choreographer",
  "creative_director",
  "producer",
  "talent_agency",
  "studio_owner",
  "dance_company",
  "brand",
  "production_company",
  "event_organizer",
  "other",
]);

const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^https?:\/\/.+/i.test(value), "Enter a valid URL.");

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required."),
  organizationName: z.string().trim().optional(),
  organizationWebsite: optionalUrlSchema,
  email: z.string().trim().email("Enter a valid email.").optional(),
  buyerRole: talentBuyerRoleSchema.optional().nullable(),
  verificationLinks: z
    .object({
      companyWebsite: optionalUrlSchema,
      linkedin: optionalUrlSchema,
      instagram: optionalUrlSchema,
    })
    .optional(),
});

export type UpdateBuyerProfileInput = z.infer<typeof updateProfileSchema>;

export type UpdateBuyerProfileResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const HEADSHOTS_BUCKET = "headshots";
const MAX_AVATAR_BYTES = 12 * 1024 * 1024;

function getFileExtension(file: { name?: string; type?: string }, fallback: string) {
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (file.type?.includes("png")) return "png";
  if (file.type?.includes("webp")) return "webp";
  return fallback;
}

function normalizeUrlList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item : "")).filter(Boolean);
}

function revalidateBuyerProfilePaths() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
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
  const currentEmail = (user.email ?? "").trim().toLowerCase();
  let emailConfirmationRequired = false;

  if (nextEmail && nextEmail !== currentEmail) {
    const { error: authEmailError } = await supabase.auth.updateUser({ email: nextEmail });
    if (authEmailError) {
      return { ok: false, error: authEmailError.message };
    }
    emailConfirmationRequired = true;
  }

  const profileUpdate: {
    display_name: string;
    first_name: string;
    last_name: string | null;
    email?: string;
  } = {
    display_name: parsed.data.fullName.trim(),
    first_name: firstName,
    last_name: lastName || null,
  };

  if (nextEmail) {
    profileUpdate.email = nextEmail;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("user_id", user.id);

  if (profileError) return { ok: false, error: profileError.message };

  const buyerUpdate: {
    organization_name: string | null;
    organization_website: string | null;
    role?: TalentBuyerRole;
    non_talent_type?: string | null;
    verification_links?: TalentBuyerVerificationLinks;
    work_email?: string;
  } = {
    organization_name: parsed.data.organizationName?.trim() || null,
    organization_website: parsed.data.organizationWebsite?.trim() || null,
  };

  if (parsed.data.buyerRole) {
    buyerUpdate.role = parsed.data.buyerRole;
    buyerUpdate.non_talent_type = mapBuyerRoleToLegacyNonTalentType(parsed.data.buyerRole);
  }

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

  const { error: buyerError } = await supabase
    .from("non_talent_profiles")
    .update(buyerUpdate)
    .eq("id", user.id);

  if (buyerError) return { ok: false, error: buyerError.message };

  revalidateBuyerProfilePaths();

  if (emailConfirmationRequired) {
    return {
      ok: true,
      message: "Profile saved. Check your inbox to confirm the new email address.",
    };
  }

  return { ok: true };
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
    if (!contentType.startsWith("image/")) {
      return { ok: false, error: "Profile photo must be an image file." };
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return { ok: false, error: "Profile photo must be under 12 MB." };
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const fileName = file instanceof File ? file.name : "avatar.jpg";
    const ext = getFileExtension({ name: fileName, type: contentType }, "jpg");
    const timestamp = Math.floor(Date.now() / 1000);
    const userFolder = user.id.toLowerCase();
    const displayPath = `${userFolder}/headshot_0_${timestamp}.${ext}`;
    const sourcePath = `${userFolder}/headshot_0_${timestamp}_source.${ext}`;
    const uploadOptions = { contentType, upsert: true };

    const displayUpload = await supabase.storage.from(HEADSHOTS_BUCKET).upload(displayPath, bytes, uploadOptions);
    if (displayUpload.error) {
      return { ok: false, error: displayUpload.error.message };
    }

    const sourceUpload = await supabase.storage.from(HEADSHOTS_BUCKET).upload(sourcePath, bytes, uploadOptions);
    if (sourceUpload.error) {
      return { ok: false, error: sourceUpload.error.message };
    }

    const { data: displayPublic } = supabase.storage.from(HEADSHOTS_BUCKET).getPublicUrl(displayPath);
    const { data: sourcePublic } = supabase.storage.from(HEADSHOTS_BUCKET).getPublicUrl(sourcePath);

    const { data: existing } = await supabase
      .from("profiles")
      .select("headshot_urls, headshot_original_urls")
      .eq("user_id", user.id)
      .maybeSingle<{ headshot_urls: string[] | null; headshot_original_urls: string[] | null }>();

    const nextDisplay = normalizeUrlList(existing?.headshot_urls);
    const nextOriginal = normalizeUrlList(existing?.headshot_original_urls);
    nextDisplay[0] = displayPublic.publicUrl;
    nextOriginal[0] = sourcePublic.publicUrl;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        headshot_urls: nextDisplay,
        headshot_original_urls: nextOriginal,
      })
      .eq("user_id", user.id);

    if (profileError) return { ok: false, error: profileError.message };

    revalidateBuyerProfilePaths();
    return { ok: true, avatarUrl: displayPublic.publicUrl };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Profile photo upload failed.",
    };
  }
}

export async function updateBuyerNotificationPreferences(
  preferences: TalentBuyerNotificationPreferences,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("non_talent_profiles")
    .update({ notification_preferences: preferences })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function updateBuyerVerificationLinks(
  links: TalentBuyerVerificationLinks,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("non_talent_profiles")
    .update({ verification_links: links })
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
    .select("account_type")
    .eq("user_id", user.id)
    .maybeSingle<{ account_type: string | null }>();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  if (!profile || !isHiringAccount(profile.account_type)) {
    return { ok: false, error: "Only talent buyer accounts can be deleted from this page." };
  }

  const { error: deleteError } = await supabase.rpc("delete_my_account");
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  await supabase.auth.signOut();

  return { ok: true };
}
