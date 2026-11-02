"use server";

import { headers } from "next/headers";
import { resolveAuthCallbackOrigin } from "@/lib/auth/redirects";
import { revalidatePath } from "next/cache";

import { buildAuthDisplayNameMetadata } from "@/lib/auth/profile";
import { birthDateError } from "@/lib/onboarding/birth-date";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const usernameRegex = /^[a-z0-9_]{3,30}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { supabase: null, user: null, error: "Supabase is not configured." as const };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: "You must be signed in." as const };
  return { supabase, user, error: null };
}

function refreshAccount() {
  revalidatePath("/settings");
  revalidatePath("/home");
  revalidatePath("/profile/[slug]", "page");
  revalidatePath("/dashboard/settings");
  revalidatePath("/", "layout");
}

export async function updateTalentAccount(input: {
  firstName: string;
  lastName: string;
  username: string;
  dateOfBirth: string;
  contactEmail: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, error: auth.error ?? "You must be signed in." };

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const username = input.username.trim().toLowerCase().replace(/^@/, "");
  const contactEmail = input.contactEmail.trim();
  const dateOfBirth = input.dateOfBirth.trim();

  if (!firstName || !lastName) return { ok: false, error: "Enter your first and last name." };
  if (!usernameRegex.test(username)) {
    return { ok: false, error: "Enter a valid username." };
  }
  if (!emailRegex.test(contactEmail)) {
    return { ok: false, error: "Enter a valid contact email." };
  }
  if (dateOfBirth) {
    const dobError = birthDateError(dateOfBirth);
    if (dobError) return { ok: false, error: dobError };
  }

  const { data: current, error: currentError } = await auth.supabase
    .from("profiles")
    .select("username")
    .eq("user_id", auth.user.id)
    .maybeSingle<{ username: string | null }>();
  if (currentError) return { ok: false, error: "Could not save account changes. Please try again." };

  if ((current?.username ?? "").toLowerCase() !== username) {
    const { data: available, error: usernameError } = await auth.supabase.rpc("is_username_available", {
      candidate: username,
    });
    if (usernameError) return { ok: false, error: "Could not check that username. Please try again." };
    if (!available) return { ok: false, error: "Username is already taken. Please choose a different username." };
  }

  const displayName = `${firstName} ${lastName}`.trim();
  const update: Record<string, string> = {
    first_name: firstName,
    last_name: lastName,
    username,
    contact_email: contactEmail,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  };
  if (dateOfBirth) update.date_of_birth = dateOfBirth;

  const { error } = await auth.supabase.from("profiles").update(update).eq("user_id", auth.user.id);
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("username") && message.includes("unique")) {
      return { ok: false, error: "Username is already taken. Please choose a different username." };
    }
    if (message.includes("username") && message.includes("check")) {
      return { ok: false, error: "Enter a valid username." };
    }
    return { ok: false, error: "Could not save account changes. Please try again." };
  }

  await auth.supabase.auth.updateUser({
    data: buildAuthDisplayNameMetadata({ firstName, lastName, displayName }),
  });
  refreshAccount();
  return { ok: true };
}

export async function updateTalentEmail(
  email: string,
): Promise<{ ok: true; confirmationRequired: boolean } | { ok: false; error: string }> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, error: auth.error ?? "You must be signed in." };

  const nextEmail = email.trim().toLowerCase();
  if (!emailRegex.test(nextEmail)) return { ok: false, error: "Enter a valid email." };
  const currentEmail = (auth.user.email ?? "").trim().toLowerCase();
  if (nextEmail === currentEmail) return { ok: true, confirmationRequired: false };

  const { error } = await auth.supabase.auth.updateUser({ email: nextEmail }, { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.motiion.app"}/auth/callback?type=email_change` });
  if (error) return { ok: false, error: error.message };

  // Keep the verified account address until the authentication provider confirms the change.
  refreshAccount();
  return { ok: true, confirmationRequired: true };
}

export async function updateTalentPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user?.email) return { ok: false, error: auth.error ?? "You must be signed in." };
  if (!input.currentPassword || !input.newPassword) {
    return { ok: false, error: "Enter your current password and a new password." };
  }

  const { error: signInError } = await auth.supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: input.currentPassword,
  });
  if (signInError) return { ok: false, error: "Current password is incorrect." };

  const { error } = await auth.supabase.auth.updateUser({ password: input.newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendTalentPasswordReset(): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireUser();
  if (!auth.supabase || !auth.user?.email) return { ok: false, error: auth.error ?? "You must be signed in." };
  const requestHeaders = await headers();
  const configured = process.env.NEXT_PUBLIC_SITE_URL || "https://www.motiion.app";
  const origin = resolveAuthCallbackOrigin(configured, requestHeaders.get("x-forwarded-host"), configured);
  const { error } = await auth.supabase.auth.resetPasswordForEmail(auth.user.email, { redirectTo: `${origin}/auth/callback?flow=recovery` });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setTalentAccountPrivate(
  isPrivate: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof isPrivate !== "boolean") return { ok: false, error: "Choose your profile visibility." };
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, error: auth.error ?? "You must be signed in." };

  const { error } = await auth.supabase
    .from("profiles")
    .update({ is_private: isPrivate, updated_at: new Date().toISOString() })
    .eq("user_id", auth.user.id).select("user_id").single();
  if (error) return { ok: false, error: "Could not update privacy setting. Please try again." };
  refreshAccount();
  return { ok: true };
}

export async function setTalentAgeHidden(hideAge: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof hideAge !== "boolean") return { ok: false, error: "Choose whether to hide your age." };
  const auth = await requireUser();
  if (!auth.supabase || !auth.user) return { ok: false, error: auth.error ?? "You must be signed in." };
  const { error } = await auth.supabase.from("profiles").update({ hide_age: hideAge }).eq("user_id", auth.user.id).select("user_id").single();
  if (error) return { ok: false, error: "Couldn’t update age visibility. Please try again." };
  refreshAccount();
  return { ok: true };
}
