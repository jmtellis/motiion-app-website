import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

/**
 * Accept only a real service_role JWT. Publishable/anon keys look configured but
 * do not bypass RLS, so credit search silently returns empty results.
 */
export function isValidServiceRoleKey(raw: string | undefined | null): boolean {
  const key = raw?.trim();
  if (!key) return false;
  if (key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) return false;
  if (!key.startsWith("eyJ")) return false;
  try {
    const payloadPart = key.split(".")[1];
    if (!payloadPart) return false;
    const b64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as { role?: string };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

/**
 * Next.js prefers existing process env over `.env.local`. Local shells sometimes
 * export a publishable key as SUPABASE_SERVICE_ROLE_KEY, which then shadows the
 * real JWT. In development, recover from `.env.local` when that happens.
 */
function resolveServiceRoleKey(): string | undefined {
  const fromEnv = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (isValidServiceRoleKey(fromEnv)) return fromEnv;

  if (process.env.NODE_ENV === "production") return fromEnv;

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!existsSync(envPath)) return fromEnv;
    const match = readFileSync(envPath, "utf8").match(
      /^SUPABASE_SERVICE_ROLE_KEY=["']?([^"'#\r\n]+)["']?/m,
    );
    const fromFile = match?.[1]?.trim();
    if (isValidServiceRoleKey(fromFile)) return fromFile;
  } catch {
    // Ignore filesystem errors; fall through.
  }

  return fromEnv;
}

export function createAdminSupabaseClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const serviceRoleKey = resolveServiceRoleKey();
  if (!isValidServiceRoleKey(serviceRoleKey)) {
    if (serviceRoleKey?.trim()) {
      // Warn (not error): Next overlays console.error, and a publishable key in the
      // process env commonly overrides a valid JWT in .env.local.
      console.warn(
        "SUPABASE_SERVICE_ROLE_KEY is not a valid service_role JWT (process env may be overriding .env.local). Credit search will use the session client when available.",
      );
    }
    return null;
  }

  const { supabaseUrl } = getSupabaseEnv();

  return createClient(supabaseUrl, serviceRoleKey!.trim(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function hasAdminSupabaseEnv() {
  return hasSupabaseEnv() && isValidServiceRoleKey(resolveServiceRoleKey());
}
