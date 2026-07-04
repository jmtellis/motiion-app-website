/**
 * Seed verified talent + opportunities for LA beta cold start.
 * Usage: SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... SEED_OWNER_USER_ID=... npx tsx scripts/seed-la-beta.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const ownerId = process.env.SEED_OWNER_USER_ID;
  if (!ownerId) {
    console.error("Set SEED_OWNER_USER_ID");
    process.exit(1);
  }

  // Run opportunity seed logic inline
  const { execSync } = await import("node:child_process");
  execSync("npx tsx scripts/seed-opportunities.ts", { stdio: "inherit", env: process.env });

  const { data: talentProfiles } = await supabase
    .from("professional_profiles")
    .select("id")
    .eq("is_verified", false)
    .limit(10);

  for (const row of talentProfiles ?? []) {
    await supabase
      .from("professional_profiles")
      .update({ is_verified: true, verified_at: new Date().toISOString() })
      .eq("id", row.id);
  }

  console.log(`Marked ${talentProfiles?.length ?? 0} profiles verified for beta`);
}

main();
