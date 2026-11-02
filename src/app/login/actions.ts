"use server";

import { cookies } from "next/headers";
import { AUTH_RETURN_COOKIE, serializeAuthReturn } from "@/lib/auth/pending-return";
import { safeAuthReturnPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProfileDestination } from "@/lib/auth/profile";
import { getCurrentUserProfile } from "@/lib/auth/session";

export async function resolveLoginDestination(): Promise<string> {
  const profile = await getCurrentUserProfile();
  return getProfileDestination(profile);
}

export async function rememberLoginReturnPath(value: string) {
  const path = safeAuthReturnPath(value);
  if (!path) return;
  const db = await createServerSupabaseClient();
  const { data } = db ? await db.auth.getUser() : { data: { user: null } };
  if (!data.user) return;
  const store = await cookies();
  store.set(AUTH_RETURN_COOKIE, serializeAuthReturn(data.user.id, path), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}
