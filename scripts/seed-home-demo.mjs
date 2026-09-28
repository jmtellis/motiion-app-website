/**
 * Talent Home fixtures for the isolated industry-staging database (rerunnable).
 * Castings mirror the iOS `demo/seeded-product-data` seed (Supabase/seed/demo.sql);
 * Motiion events and the extra classes/sessions are fictional staging-only additions.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

process.loadEnvFile(".env.local");
const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (origin !== "https://mvkvztpvakybrhyupown.supabase.co")
  throw new Error("This seed only runs against industry-staging.");
const db = createClient(origin, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const owner = "ed795f56-1507-4496-9f25-a14d0867d4fd";
const { data: ownerProfile, error: ownerError } = await db
  .from("profiles")
  .select("email")
  .eq("user_id", owner)
  .single();
if (ownerError || ownerProfile.email !== "industry.staging@example.com")
  throw new Error("Expected fictional staging owner not found.");

// iOS demo castings are posted by Avery Quinn, an industry persona on Pro (publishing past the free quota).
const averyEmail = "demo_avery_quinn@example.com";
const { data: users, error: usersError } = await db.auth.admin.listUsers({ perPage: 1000 });
if (usersError) throw new Error("Could not inspect staging fixture users");
let avery = users.users.find((user) => user.email === averyEmail);
if (!avery) {
  const result = await db.auth.admin.createUser({
    email: averyEmail,
    password: randomBytes(32).toString("base64url"),
    email_confirm: true,
    user_metadata: { first_name: "Avery", last_name: "Quinn", account_type: "lookingForTalent", is_demo: true },
  });
  if (result.error) throw new Error("Could not create fictional poster: " + result.error.message);
  avery = result.data.user;
}
const poster = avery.id;
{
  const { error } = await db.from("profiles").upsert(
    {
      user_id: poster,
      first_name: "Avery",
      last_name: "Quinn",
      display_name: "Avery Quinn",
      email: averyEmail,
      username: "demo_avery_quinn",
      account_type: "lookingForTalent",
      active_shell: "lookingForTalent",
      enabled_shells: ["lookingForTalent"],
      notifications_enabled: false,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`profiles: ${error.message}`);
  const { data: existing } = await db
    .from("subscriptions")
    .select("id")
    .eq("user_id", poster)
    .eq("billing_source", "apple_iap")
    .maybeSingle();
  const subscription = {
    user_id: poster,
    billing_source: "apple_iap",
    provider: "apple",
    status: "active",
    tier: "pro",
    app_store_product_id: "com.motiion.industry.pro.monthly",
    current_period_start: new Date(Date.now() - 10 * 86400000).toISOString(),
    current_period_end: new Date(Date.now() + 365 * 86400000).toISOString(),
    cancel_at_period_end: false,
    provider_verified: true,
  };
  const { error: subError } = existing
    ? await db.from("subscriptions").update(subscription).eq("id", existing.id)
    : await db.from("subscriptions").insert(subscription);
  if (subError) throw new Error(`subscriptions: ${subError.message}`);
  console.log("Avery Quinn: fictional Pro poster ready");
}

const id = (key) => {
  const h = createHash("sha256").update("motiion-home-demo-v1:" + key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const date = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const at = (days) => new Date(Date.now() + days * 86400000).toISOString();
const photo = (key, w = 1200) => `https://images.unsplash.com/${key}?auto=format&fit=crop&w=${w}&q=85`;

function brandfetchClientId() {
  if (process.env.BRANDFETCH_CLIENT_ID) return process.env.BRANDFETCH_CLIENT_ID;
  const secrets = "../motiion-app-ios/Config/Secrets.xcconfig";
  if (!existsSync(secrets)) return "";
  const line = readFileSync(secrets, "utf8").split("\n").find((row) => /^BRANDFETCH_CLIENT_ID\s*=/.test(row));
  return line ? line.replace(/^[^=]*=\s*/, "").trim() : "";
}
const client = brandfetchClientId();
const logo = (domain) =>
  `https://cdn.brandfetch.io/domain/${domain}/w/400/h/400/theme/dark/fallback/lettermark/type/icon${client ? `?c=${client}` : ""}`;
const chrisArtwork = "https://image-cdn-ak.spotifycdn.com/image/ab6761610000e5eb913ab85302df0ddfb77131e9";

async function put(table, rows) {
  const { error } = await db.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`${table}: ${rows.length} fictional records`);
}

const modules = { casting: true, activities: false };
const castings = [
  {
    key: "northline",
    title: "Northline",
    description: "A two-day commercial with a featured dancer and a small ensemble. Callbacks are in Los Angeles.",
    company: "Northwind Pictures",
    logo: null,
    cover: null,
    visibility: "public",
    shoot: [30, 32],
    castingDescription: "Lead dancer and ensemble for a branded film.",
    deadline: 21,
    posted: -6,
    role: {
      title: "Lead Dancer",
      production: "Northline",
      description: "Featured dancer for the campaign film. Contemporary base, comfortable on camera, available for a two-day shoot.",
      ages: [18, 32],
      people: 1,
    },
  },
  {
    key: "target",
    title: "Bullseye Holiday",
    description: "A holiday commercial with an ensemble of dancers in a Target store set. Two shoot days in Los Angeles.",
    company: "Target",
    logo: logo("target.com"),
    cover: logo("target.com"),
    visibility: "public",
    shoot: [18, 19],
    castingDescription: "Ensemble dancers for the Target holiday spot.",
    deadline: 14,
    posted: -2,
    role: {
      title: "Ensemble Dancer",
      production: "Target",
      description: "Commercial jazz and hip-hop. Store-set movement, comfortable in a group of eight.",
      ages: [18, 35],
      people: 8,
    },
  },
  {
    key: "apple",
    title: "Shot on iPhone",
    description: "A dance film shot on iPhone. Featured dancer, one rehearsal day and one shoot day.",
    company: "Apple",
    logo: logo("apple.com"),
    cover: logo("apple.com"),
    visibility: "public",
    shoot: [24, 25],
    castingDescription: "Featured dancer for an Apple dance film.",
    deadline: 18,
    posted: -1,
    role: {
      title: "Featured Dancer",
      production: "Apple",
      description: "On-camera contemporary. One featured phrase and a small group section.",
      ages: [18, 32],
      people: 1,
    },
  },
  {
    key: "chris",
    title: "Under the Influence",
    description: "Music video dancers for Chris Brown. Hip-hop base, comfortable with partner work and camera.",
    company: "Chris Brown",
    logo: logo("chrisbrown.com"),
    cover: chrisArtwork,
    visibility: "public",
    shoot: [12, 14],
    castingDescription: "Dancers for the Chris Brown music video.",
    deadline: 10,
    posted: -4,
    role: {
      title: "Music Video Dancer",
      production: "Chris Brown",
      description: "Hip-hop and heels. Partnering, sharp musicality, and a full performance day.",
      ages: [18, 30],
      people: 12,
    },
  },
  {
    key: "nike",
    title: "Move With Us",
    description: "Invite-only principal dancer for a Nike Air Max spot.",
    company: "Nike",
    logo: logo("nike.com"),
    cover: logo("nike.com"),
    visibility: "unlisted",
    shoot: [40, 42],
    castingDescription: "Private invite for the Nike principal dancer.",
    deadline: 28,
    posted: -3,
    role: {
      title: "Principal Dancer",
      production: "Nike",
      description: "Invite-only. Athletic contemporary for the Air Max spot.",
      ages: [18, 32],
      people: 1,
    },
  },
];

await put(
  "projects",
  castings.map((c) => ({
    id: id(`project:${c.key}`),
    poster_id: poster,
    title: c.title,
    description: c.description,
    production_company: c.company,
    production_company_logo_url: c.logo,
    cover_image_url: c.cover,
    location: "Los Angeles, CA",
    visibility: c.visibility,
    is_active: true,
    project_type: "production",
    enabled_modules: modules,
    start_date: date(c.shoot[0]),
    end_date: date(c.shoot[1]),
  })),
);
await put(
  "castings",
  castings.map((c) => ({
    id: id(`casting:${c.key}`),
    project_id: id(`project:${c.key}`),
    title: c.title,
    description: c.castingDescription,
    visibility: c.visibility,
    status: "open",
    created_by: poster,
    submission_deadline: at(c.deadline),
  })),
);
await put(
  "roles",
  castings.map((c) => ({
    id: id(`role:${c.key}`),
    poster_id: poster,
    project_id: id(`project:${c.key}`),
    casting_id: id(`casting:${c.key}`),
    title: c.role.title,
    production: c.role.production,
    description: c.role.description,
    age_range_min: c.role.ages[0],
    age_range_max: c.role.ages[1],
    people_needed: c.role.people,
    is_active: true,
    is_casting_finalized: false,
    visibility: c.visibility,
    gender: "Any",
    cover_image_url: c.cover,
    created_at: at(c.posted),
  })),
);

const hosts = {
  maya: "b897e5e6-efab-4b6a-bfc4-fbf12b1cadcc",
  jordan: "dea3cf04-e340-45de-a86c-27444a7e8c63",
  sofia: "5be0ea69-4eb4-4f2d-aec6-7849a5719449",
  aria: "526cca0c-1e09-43ab-8814-d7d147958c14",
};

const activity = (key, fields) => ({
  id: id(`activity:${key}`),
  creator_id: poster,
  location: "Los Angeles, CA",
  is_private: false,
  status: "active",
  sponsored_by_motiion: false,
  ...fields,
});

// Only platform admins may publish Motiion-sponsored events, so they come from a fictional
// Motiion host account signed in with a throwaway password (never stored).
const motiionEmail = "demo_motiion_host@example.com";
let motiion = users.users.find((user) => user.email === motiionEmail);
const motiionPassword = randomBytes(32).toString("base64url");
if (!motiion) {
  const result = await db.auth.admin.createUser({
    email: motiionEmail,
    password: motiionPassword,
    email_confirm: true,
    user_metadata: { first_name: "Motiion", last_name: "Events", account_type: "lookingForTalent", is_demo: true },
  });
  if (result.error) throw new Error("Could not create fictional host: " + result.error.message);
  motiion = result.data.user;
} else {
  const { error } = await db.auth.admin.updateUserById(motiion.id, { password: motiionPassword });
  if (error) throw new Error("Could not prepare fictional host: " + error.message);
}
{
  const { error } = await db.from("profiles").upsert(
    {
      user_id: motiion.id,
      first_name: "Motiion",
      last_name: "Events",
      display_name: "Motiion",
      email: motiionEmail,
      username: "demo_motiion_host",
      account_type: "lookingForTalent",
      active_shell: "lookingForTalent",
      enabled_shells: ["lookingForTalent"],
      notifications_enabled: false,
      role: "admin",
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`profiles: ${error.message}`);
}
const host = createClient(origin, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
{
  const { error } = await host.auth.signInWithPassword({ email: motiionEmail, password: motiionPassword });
  if (error) throw new Error("Could not sign in fictional host: " + error.message);
}
const sponsored = [
  activity("motiion-open-house", {
    title: "Motiion Open House",
    type: "event",
    sponsored_by_motiion: true,
    description: "Meet the community, casting teams, and the Motiion crew. Drinks, a live showcase, and an open cypher to close the night.",
    cover_image_url: photo("photo-1492684223066-81342ee5ff30"),
    activity_date: date(9),
    start_time: "19:00",
    end_time: "23:00",
    max_attendees: 250,
    spots_remaining: 140,
  }),
  activity("motiion-showcase-fall", {
    title: "Motiion Showcase: Fall Edition",
    type: "event",
    sponsored_by_motiion: true,
    description: "Eight choreographers, one stage. New work from the Motiion community, with casting directors in the room.",
    cover_image_url: photo("photo-1501386761578-eac5c94b800a"),
    activity_date: date(23),
    start_time: "20:00",
    end_time: "22:30",
    max_attendees: 400,
    spots_remaining: 210,
  }),
  activity("motiion-industry-night", {
    title: "Motiion Industry Night",
    type: "event",
    sponsored_by_motiion: true,
    description: "An evening for dancers, choreographers, and the teams who hire them. Short panels, then music.",
    cover_image_url: photo("photo-1514525253161-7a46d19cd819"),
    activity_date: date(41),
    start_time: "18:30",
    end_time: "22:00",
    max_attendees: 180,
    spots_remaining: 95,
  }),
].map((row) => ({ ...row, creator_id: motiion.id, root_job_id: id(`job-${row.id}`) }));
{
  const jobs = sponsored.map((row) => ({
    id: row.root_job_id,
    poster_id: motiion.id,
    title: row.title,
    job_type: "showcase",
    description: row.description,
    start_date: row.activity_date,
    end_date: row.end_date ?? row.activity_date,
    location: row.location,
    cover_image_url: row.cover_image_url,
    status: "upcoming",
    is_private: true,
    final_select_ids: [],
  }));
  const { error: jobError } = await host.from("jobs").upsert(jobs, { onConflict: "id" });
  if (jobError) throw new Error(`jobs: ${jobError.message}`);
  const { error } = await host.from("activities").upsert(sponsored, { onConflict: "id" });
  if (error) throw new Error(`activities (sponsored): ${error.message}`);
  console.log(`activities: ${sponsored.length} Motiion events`);
  await host.auth.signOut();
}

await put("activities", [
  activity("contemporary-lab", {
    title: "Contemporary Lab — Phrase Work",
    type: "class",
    description: "A two-hour phrase lab. Bring something you can sweat in. No partner required.",
    cover_image_url: photo("photo-1508700929628-666bc8bd84ea"),
    activity_date: date(18),
    start_time: "18:30",
    end_time: "20:30",
    max_attendees: 24,
    spots_remaining: 18,
    class_skill_level: "Intermediate",
    class_focus: "Phrase work",
    class_what_you_will_learn: [
      "Learn a camera-friendly phrase",
      "Rework spacing in small groups",
      "Leave with a short combo",
    ],
  }),
  activity("ballet-barre", {
    creator_id: hosts.sofia,
    title: "Ballet Barre for Commercial Dancers",
    type: "class",
    description: "Technique that holds up on set: turnout, placement, and clean lines in a 75-minute barre.",
    cover_image_url: photo("photo-1518834107812-67b0b7c58434"),
    activity_date: date(1),
    start_time: "10:00",
    end_time: "11:15",
    max_attendees: 20,
    spots_remaining: 6,
    price_amount_cents: 2500,
    price_currency: "usd",
    class_skill_level: "All levels",
  }),
  activity("heels-foundations", {
    creator_id: hosts.aria,
    title: "Heels Foundations",
    type: "class",
    description: "Walks, floor work, and a short combo. Bring heels you can move in.",
    cover_image_url: photo("photo-1547153760-18fc86324498"),
    activity_date: date(2),
    start_time: "19:00",
    end_time: "20:30",
    max_attendees: 24,
    spots_remaining: 11,
    price_amount_cents: 3000,
    price_currency: "usd",
    class_skill_level: "Beginner",
  }),
  activity("open-cypher", {
    creator_id: hosts.jordan,
    title: "Freestyle Session: Open Cypher",
    type: "session",
    description: "DJ, open floor, no choreography. Come through to train and trade.",
    cover_image_url: photo("photo-1535525153412-5a42439a210d"),
    activity_date: date(3),
    start_time: "20:00",
    end_time: "22:00",
    max_attendees: 60,
    spots_remaining: 38,
    session_level: "Open",
  }),
  activity("hiphop-grooves", {
    creator_id: hosts.jordan,
    title: "Hip-Hop Grooves Intensive",
    type: "class",
    description: "Foundational grooves, bounce and rock, then a full-out combo.",
    cover_image_url: photo("photo-1524594152303-9fd13543fe6e"),
    activity_date: date(5),
    start_time: "18:00",
    end_time: "20:00",
    max_attendees: 30,
    spots_remaining: 14,
    price_amount_cents: 3500,
    price_currency: "usd",
    class_skill_level: "Intermediate",
  }),
  activity("camera-ready", {
    creator_id: hosts.maya,
    title: "Camera Ready — Reel Session",
    type: "session",
    description: "Shoot a 30-second reel clip with a director of photography. Leave with footage for your Motiion visuals.",
    cover_image_url: photo("photo-1545128485-c400e7702796"),
    activity_date: date(7),
    start_time: "12:00",
    end_time: "16:00",
    max_attendees: 12,
    spots_remaining: 4,
    price_amount_cents: 6000,
    price_currency: "usd",
    session_level: "Open",
  }),
  activity("commercial-jazz", {
    creator_id: hosts.aria,
    title: "Commercial Jazz Combo",
    type: "class",
    description: "Sharp, musical, camera-facing jazz. We learn the combo and run it in groups.",
    cover_image_url: photo("photo-1504609813442-a8924e83f76e"),
    activity_date: date(9),
    start_time: "11:00",
    end_time: "12:30",
    max_attendees: 28,
    spots_remaining: 15,
    price_amount_cents: 3000,
    price_currency: "usd",
    class_skill_level: "Intermediate",
  }),
  activity("partnering-lab", {
    creator_id: hosts.sofia,
    title: "Partnering & Lifts Workshop",
    type: "session",
    description: "Weight sharing, safe lifts, and trust work. Come with or without a partner.",
    cover_image_url: photo("photo-1526485856375-9110812fbf35"),
    activity_date: date(12),
    start_time: "14:00",
    end_time: "17:00",
    max_attendees: 16,
    spots_remaining: 8,
    session_level: "Intermediate",
  }),
]);

console.log("Talent Home demo data ready.");
