import { getSupabaseEnv } from "@/lib/supabase/env";
import { rosterDocument } from "@/lib/shared-roster-document";

export const dynamic = "force-dynamic";
export async function GET() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const config = JSON.stringify({ url: supabaseUrl, key: supabaseAnonKey }).replace(/</g, "\\u003c");
  return new Response(rosterDocument.replace("__ROSTER_CONFIG__", config), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    },
  });
}
