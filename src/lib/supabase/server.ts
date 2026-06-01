import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

export async function createServerSupabaseClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const cookieStore = await cookies();
  const { supabaseAnonKey, supabaseUrl } = getSupabaseEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies (Next.js restriction).
          // Session refresh is handled in middleware via updateSession().
        }
      },
    },
  });
}
