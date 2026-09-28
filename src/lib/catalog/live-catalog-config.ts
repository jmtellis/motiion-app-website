import { PRODUCTION_SUPABASE_REF, type AppEnvironment } from "@/lib/environment";
import { isValidServiceRoleKey } from "@/lib/supabase/admin";

const PRODUCTION_HOSTS = new Set([`${PRODUCTION_SUPABASE_REF}.supabase.co`, "api.motiion.app"]);

export type LiveCatalogConfig = {
  origin: string;
  anonKey: string;
  secretKey: string;
};

type Env = Record<string, string | undefined>;

/** Server-only public catalog. Disabled in production, and only for the live project. */
export function resolveLiveCatalogConfig(env: Env, environment: AppEnvironment): LiveCatalogConfig | null {
  if (environment === "production") return null;
  const raw = env.CATALOG_SUPABASE_URL?.trim();
  const anonKey = env.CATALOG_SUPABASE_ANON_KEY?.trim();
  const secretKey = env.CATALOG_SUPABASE_SECRET_KEY?.trim();
  if (!raw || !anonKey || !secretKey) return null;
  if (isValidServiceRoleKey(anonKey) || !isValidServiceRoleKey(secretKey)) return null;
  let origin: string;
  let host: string;
  try {
    const url = new URL(raw);
    host = url.hostname.replace(/^www\./, "");
    origin = url.origin;
  } catch {
    return null;
  }
  if (!PRODUCTION_HOSTS.has(host)) return null;
  return { origin, anonKey, secretKey };
}
