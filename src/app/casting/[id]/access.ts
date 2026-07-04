"use server";

import { cookies } from "next/headers";

import { digestCastingPassword } from "@/lib/talent-buyers/casting-password";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type CastingAccessInfo = {
  visibility: "public" | "unlisted" | "private";
  requiresPassword: boolean;
  unlocked: boolean;
};

function accessCookieName(roleId: string) {
  return `casting_access_${roleId.toLowerCase()}`;
}

type RoleAccessRow = {
  visibility: string | null;
  password_hash: string | null;
};

async function fetchRoleAccess(roleId: string): Promise<RoleAccessRow | null> {
  const admin = createAdminSupabaseClient();
  if (!admin) return null;

  const { data } = await admin
    .from("roles")
    .select("visibility, password_hash")
    .eq("id", roleId)
    .maybeSingle<RoleAccessRow>();

  return data ?? null;
}

/** Resolve visibility + whether the viewer has unlocked a private casting. */
export async function getCastingAccess(roleId: string): Promise<CastingAccessInfo> {
  const role = await fetchRoleAccess(roleId);
  const visibility = (role?.visibility ?? "public") as CastingAccessInfo["visibility"];
  const requiresPassword = visibility === "private" && Boolean(role?.password_hash);

  if (!requiresPassword) {
    return { visibility, requiresPassword: false, unlocked: true };
  }

  const cookieStore = await cookies();
  const stored = cookieStore.get(accessCookieName(roleId))?.value;
  return {
    visibility,
    requiresPassword: true,
    unlocked: Boolean(stored && role?.password_hash && stored === role.password_hash),
  };
}

export async function unlockCasting(
  roleId: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = password.trim();
  if (!trimmed) return { ok: false, error: "Enter the casting password." };

  const role = await fetchRoleAccess(roleId);
  if (!role?.password_hash) {
    return { ok: false, error: "This casting doesn't require a password." };
  }

  if (digestCastingPassword(trimmed) !== role.password_hash) {
    return { ok: false, error: "Incorrect password. Check with the casting organizer." };
  }

  const cookieStore = await cookies();
  cookieStore.set(accessCookieName(roleId), role.password_hash, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: `/casting`,
  });

  return { ok: true };
}
