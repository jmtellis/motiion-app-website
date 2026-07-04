/**
 * Seed live LA castings for the talent magic moment.
 * Uses legacy iOS schema: projects.poster_id + castings.configuration
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   SEED_OWNER_USER_ID=<industry-user-uuid> npx tsx scripts/seed-opportunities.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const LA_CASTINGS = [
  {
    title: "Commercial — Athletic Wear",
    description: "Seeking versatile commercial dancers in Los Angeles.",
    configuration: {
      location_city: "Los Angeles",
      styles: ["Commercial", "Hip Hop"],
      special_skills: ["Freestyle"],
      union_status: "Non-union",
    },
  },
  {
    title: "Music Video — Pop Artist",
    description: "High-energy performers for a major label release.",
    configuration: {
      location_city: "Los Angeles",
      styles: ["Hip Hop", "Contemporary"],
      special_skills: ["Heels"],
    },
  },
  {
    title: "Tour — Arena Show",
    description: "Seeking strong jazz and commercial dancers for national tour prep.",
    configuration: {
      location_city: "Los Angeles",
      styles: ["Jazz", "Commercial"],
      union_status: "SAG",
    },
  },
];

async function main() {
  const posterId = process.env.SEED_OWNER_USER_ID;
  if (!posterId) {
    console.error("Set SEED_OWNER_USER_ID to an industry user auth.users.id");
    process.exit(1);
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      poster_id: posterId,
      title: "LA Beta Opportunities",
      description: "Launch seed project for talent matching",
      production_company: "Motiion Beta",
      visibility: "public",
      is_active: true,
      casting_configuration: { location_city: "Los Angeles", schema_version: 7 },
    })
    .select("id")
    .single();

  if (projectError) {
    console.error("Project insert failed:", projectError.message);
    process.exit(1);
  }

  for (const seed of LA_CASTINGS) {
    const { error } = await supabase.from("castings").insert({
      project_id: project.id,
      title: seed.title,
      description: seed.description,
      visibility: "public",
      status: "open",
      configuration: seed.configuration,
    });
    if (error) console.warn("Casting seed warning:", error.message);
  }

  console.log("Seeded LA castings under project", project.id);
}

main();
