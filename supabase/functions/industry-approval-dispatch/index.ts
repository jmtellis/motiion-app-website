import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { apnsJwt, apnsBaseUrl } from "../_shared/apns.ts";
import { createHandler } from "./handler.ts";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
Deno.serve(createHandler({ db, env: (name) => Deno.env.get(name), send: fetch, jwt: apnsJwt, baseURL: apnsBaseUrl }));
