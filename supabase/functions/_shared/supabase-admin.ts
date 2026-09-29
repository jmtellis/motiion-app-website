import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { env } from "./env.ts";

export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
