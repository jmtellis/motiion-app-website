"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env";

export function createClientSupabaseClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const { supabaseAnonKey, supabaseUrl } = getSupabaseEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
