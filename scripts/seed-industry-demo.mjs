/** Fictional, rerunnable fixtures for the isolated industry-staging database. */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
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
const id = (key) => {
  const h = createHash("sha256")
    .update("motiion-industry-demo-v2:" + key)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const date = (days) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const time = (hours) => new Date(Date.now() + hours * 3600000).toISOString();
const photo = (key, w = 800) =>
  `https://images.unsplash.com/${key}?auto=format&fit=crop&w=${w}&q=85`;
const people = [
  [
    "Maya",
    "Bennett",
    "Los Angeles",
    "Contemporary",
    "photo-1494790108377-be9c29b29330",
  ],
  ["Jordan", "Reed", "New York", "Hip Hop", "photo-1506794778202-cad84cf45f1d"],
  ["Sofia", "Cruz", "Los Angeles", "Jazz", "photo-1524504388940-b1c1722653e1"],
  [
    "Eli",
    "Parker",
    "Atlanta",
    "Commercial",
    "photo-1500648767791-00dcc994a43e",
  ],
  [
    "Amara",
    "Cole",
    "New York",
    "Contemporary",
    "photo-1517841905240-472988babdf9",
  ],
  ["Lena", "Park", "Los Angeles", "Ballet", "photo-1488426862026-3ee34a7d66df"],
  ["Noah", "Rivera", "Chicago", "Hip Hop", "photo-1508214751196-bcfd4ca60f91"],
  [
    "Aria",
    "Morgan",
    "Los Angeles",
    "Jazz Funk",
    "photo-1504593811423-6dd665756598",
  ],
];
async function put(table, rows, onConflict = "id") {
  if (!rows.length) return;
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`${table}: ${rows.length} fictional records`);
}
const { data: users, error: usersError } = await db.auth.admin.listUsers({
  perPage: 1000,
});
if (usersError) throw new Error("Could not inspect staging fixture users");
const talents = [];
for (const [first, last, city, style, img] of people) {
  const slug = `demo_${first}_${last}`.toLowerCase();
  const email = `${slug}@example.com`;
  let user = users.users.find((u) => u.email === email);
  if (!user) {
    const result = await db.auth.admin.createUser({
      email,
      password: randomBytes(32).toString("base64url"),
      email_confirm: true,
      user_metadata: {
        first_name: first,
        last_name: last,
        account_type: "talent",
        is_demo: true,
      },
    });
    if (result.error)
      throw new Error(
        "Could not create fictional profile: " + result.error.message,
      );
    user = result.data.user;
  }
  talents.push({
    user: user.id,
    pro: id(slug),
    slug,
    email,
    name: `${first} ${last}`,
    first,
    last,
    city,
    style,
    image: photo(img),
  });
}
await put(
  "profiles",
  talents.map((t) => ({
    user_id: t.user,
    first_name: t.first,
    last_name: t.last,
    display_name: t.name,
    email: t.email,
    username: t.slug,
    account_type: "talent",
    active_shell: "talent",
    enabled_shells: ["talent"],
    notifications_enabled: false,
    is_private: false,
    headshot_urls: [t.image],
    styles: [t.style, "Commercial"],
    skills: ["Choreography", "Improvisation"],
    talent_types: ["Dancer"],
    working_locations: [
      `${t.city}, ${t.city === "New York" ? "NY" : t.city === "Atlanta" ? "GA" : t.city === "Chicago" ? "IL" : "CA"}`,
    ],
    profile_review_status: "approved",
    onboarding_completed_at: time(-24 * 30),
    profile_setup_completed_at: time(-24 * 30),
  })),
  "user_id",
);
await put(
  "professional_profiles",
  talents.map((t) => ({
    id: t.pro,
    user_id: t.user,
    slug: t.slug.replaceAll("_", "-"),
    subtype: "dancer",
    bio: `Fictional staging profile. Stock photography represents this demo persona. ${t.style} dancer working across stage, film, and live performance.`,
    location_city: t.city,
    location_region:
      t.city === "New York"
        ? "NY"
        : t.city === "Atlanta"
          ? "GA"
          : t.city === "Chicago"
            ? "IL"
            : "CA",
    styles: [t.style, "Commercial"],
    skills: ["Choreography", "Improvisation"],
    availability: "available",
    is_verified: true,
  })),
);
await put(
  "media_assets",
  talents.map((t) => ({
    id: id("media-" + t.slug),
    profile_id: t.pro,
    kind: "headshot",
    storage_path: `demo/${t.slug}`,
    url: t.image,
    position: 0,
  })),
);
const work = [
  [
    "afterglow",
    "Afterglow · World Tour",
    "casting",
    "Lumen Creative",
    "photo-1514525253161-7a46d19cd819",
    false,
    28,
  ],
  [
    "kinetic",
    "Kinetic · Movement Campaign",
    "casting",
    "Kinetic Studio",
    "photo-1508700929628-666bc8bd84ea",
    true,
    14,
  ],
  [
    "solstice",
    "Solstice · Live Performance",
    "casting",
    "Solstice Company",
    "photo-1516450360452-9312f5e86fc7",
    true,
    35,
  ],
  [
    "motion-film",
    "In Motion · Short Film",
    "casting",
    "Northline Films",
    "photo-1518611012118-696072aa579a",
    true,
    45,
  ],
  [
    "studio-sessions",
    "Studio Sessions · October",
    "event",
    "Motiion Test Studio",
    "photo-1511671782779-c97d3d27a1d4",
    false,
    7,
  ],
  [
    "winter",
    "Winter Residency",
    "casting",
    "Motiion Test Studio",
    "photo-1493225457124-a3eb161ffa5f",
    true,
    60,
  ],
];
const projects = work.map(
  ([key, title, type, company, img, draft, days], i) => ({
    id: id("project-" + key),
    poster_id: owner,
    title,
    description: `Fictional demo production for the industry staging workspace. ${title} brings together a versatile ensemble for an original movement-led production. Looking for expressive collaborators with strong musicality and confident performance quality.`,
    production_company: company,
    project_type: type,
    is_active: !draft,
    visibility: "private",
    location: "Los Angeles, CA",
    start_date: date(days),
    end_date: date(days + 4),
    cover_image_url: photo(img, 1400),
    rate_type: "flat",
    rate_details: { amount: 1500, currency: "USD" },
    is_union: false,
    project_configuration: { composer_draft: draft, demo: true },
    casting_configuration: {
      schema_version: 7,
      composer_draft: draft || type !== "casting",
      location_city: "Los Angeles, CA",
      submission_method_raw: "submit_through_motiion",
      compensation_category_raw: "paid",
      paid_rate_presentation_raw: "flat_fee",
      visibility_presentation_raw: "private",
      submission_deadline_iso8601: time(24 * (days - 7)),
    },
    updated_at: time(-i * 7),
    created_at: time(-24 * (25 - i)),
  }),
);
await put("projects", projects);
const castings = projects
  .filter((p) => p.project_type === "casting")
  .map((p) => ({
    id: id("casting-" + p.id),
    project_id: p.id,
    title: p.title,
    description: p.description,
    visibility: "private",
    status: p.is_active ? "published" : "draft",
    created_by: owner,
    submission_deadline: time(24 * 10),
    configuration: {
      schema_version: 7,
      location_city: "Los Angeles, CA",
      submission_method_raw: "submit_through_motiion",
      compensation_category_raw: "paid",
      paid_rate_presentation_raw: "flat_fee",
      submission_deadline_iso8601: time(24 * 10),
    },
    allow_external_candidates: true,
  }));
await put("castings", castings);
const roles = castings.flatMap((c, i) =>
  ["Principal dancers", "Ensemble dancers"].map((title, j) => ({
    id: id(`role-${c.id}-${j}`),
    casting_id: c.id,
    project_id: c.project_id,
    poster_id: owner,
    title,
    production: c.title,
    description: j
      ? "Versatile ensemble performers with strong musicality and partnering experience."
      : "Expressive performers who can lead with individuality and collaborate with the creative team.",
    people_needed: j ? 6 : 2,
    is_active: c.status === "published",
    visibility: "private",
    special_skills: j ? ["Commercial", "Hip Hop"] : ["Contemporary", "Jazz"],
    is_review_complete: false,
    final_select_ids: [],
  })),
);
await put("roles", roles);
const submissions = [],
  candidates = [];
for (const [ci, c] of castings.entries()) {
  if (c.status === "draft") continue;
  for (const [i, t] of talents.entries()) {
    const role = roles.find(
      (r) =>
        r.casting_id === c.id &&
        r.title === (i % 2 ? "Ensemble dancers" : "Principal dancers"),
    );
    const statuses = [
      "pending",
      "approved",
      "callback",
      "pending",
      "approved",
      "pending",
      "pending",
      "approved",
    ];
    const stages = [
      "submitted",
      "shortlisted",
      "callback",
      "in_review",
      "selected",
      "submitted",
      "in_review",
      "shortlisted",
    ];
    const subId = id(`submission-${c.id}-${t.pro}`);
    submissions.push({
      id: subId,
      talent_id: t.user,
      role_id: role.id,
      status: statuses[(i + ci) % 8],
      full_name: t.name,
      email: t.email,
      headshot_url: t.image,
      notes:
        "Fictional demo application. Available for the production dates and happy to send additional material.",
      application_source: "native",
      submitted_at: time(-(i + ci * 4 + 1) * 3),
    });
    candidates.push({
      id: id(`candidate-${c.id}-${t.pro}`),
      casting_id: c.id,
      project_id: c.project_id,
      talent_profile_id: t.pro,
      submission_id: subId,
      role_ids: [role.id],
      source: "public_submission",
      status: stages[(i + ci) % 8],
      display_name: t.name,
      email: t.email,
      headshot_url: t.image,
      availability_status: "available",
      created_by: owner,
      internal_notes:
        "Fictional staging candidate — use to explore the review workflow.",
    });
  }
}
await put("submissions", submissions);
await put("casting_candidates", candidates);
const lists = [
  {
    id: id("favorites"),
    owner_id: owner,
    name: "Saved Talent",
    kind: "favorites",
  },
  ...["Tour ensemble", "Commercial movers", "Contemporary collective"].map(
    (name, i) => ({
      id: id("roster-" + i),
      owner_id: owner,
      name,
      kind: "roster",
      description: [
        "Strong stage presence, ready for the road.",
        "Distinctive personalities for movement-led campaigns.",
        "Expressive collaborators for our next stage work.",
      ][i],
    }),
  ),
  ...projects
    .slice(0, 3)
    .map((p) => ({
      id: id("project-roster-" + p.id),
      owner_id: owner,
      name: p.title + " cast",
      kind: "project_roster",
      project_id: p.id,
    })),
];
// Reuse the owner's existing favorites list rather than create a duplicate.
const { data: existingFavorites } = await db
  .from("talent_lists")
  .select("id")
  .eq("owner_id", owner)
  .eq("kind", "favorites")
  .limit(1);
if (existingFavorites?.[0]) lists[0].id = existingFavorites[0].id;
await put("talent_lists", lists);
await put(
  "talent_list_members",
  lists.flatMap((l, li) =>
    talents
      .filter((_, i) => li === 0 || (i + li) % 3 !== 0)
      .map((t, i) => ({
        id: id("member-" + l.id + t.pro),
        list_id: l.id,
        profile_id: t.pro,
        added_at: time(-i * 10),
        notes: "Fictional demo roster member.",
      })),
  ),
);
const bookings = projects
  .slice(0, 3)
  .flatMap((p, pi) =>
    talents
      .slice(0, 4)
      .map((t, i) => ({
        id: id("booking-" + p.id + t.pro),
        project_id: p.id,
        talent_name: t.name,
        role: i < 2 ? "Principal dancer" : "Ensemble dancer",
        status: ["confirmed", "negotiating", "draft", "completed"][
          (i + pi) % 4
        ],
        fee_cents: 150000 + i * 25000,
        currency: "USD",
        start_date: (i + pi) % 4 === 3 ? date(-14) : p.start_date,
        end_date: (i + pi) % 4 === 3 ? date(-10) : p.end_date,
        payer_name: p.production_company,
        payer_email: "demo.production@example.com",
        terms:
          "Fictional demo terms. Rehearsal and performance fee; travel arranged separately.",
        negotiation_notes: "Demo booking for previewing the workspace.",
      })),
  );
await put("project_bookings", bookings);
const activitySpecs = [
  ["Open Studio · Contemporary Lab", "class", 1, 18],
  ["Afterglow · Callback Session", "session", 2, 11],
  ["Kinetic · Movement Workshop", "class", 4, 17],
  ["Solstice · Company Rehearsal", "session", 6, 10],
  ["Studio Social · October Edition", "event", 8, 19],
  ["Jazz Foundations · Weekly Class", "class", 3, 16],
  ["Creative Exchange · Artist Meetup", "event", 12, 18],
  ["Afterglow · Rehearsal", "session", 9, 10],
];
const eventJobs = activitySpecs
  .filter((a) => a[1] === "event")
  .map((a) => ({
    id: id("event-job-" + a[0]),
    poster_id: owner,
    title: a[0],
    description: "Fictional staging event production.",
    job_kind: "showcase",
    status: "active",
    is_private: true,
  }));
await put("jobs", eventJobs);
const activities = activitySpecs.map(([title, type, offset, hour], i) => ({
  id: id("activity-" + title),
  creator_id: owner,
  title,
  type,
  description:
    "Fictional staging activity. A focused gathering of movement artists for collaboration and creative practice.",
  status: "active",
  is_private: true,
  require_payment: false,
  location:
    i % 2 ? "Studio B · Los Angeles" : "The Movement House · Los Angeles",
  activity_date: date(offset),
  start_time: `${hour}:00:00`,
  end_time: `${hour + 2}:00:00`,
  max_attendees: 24,
  spots_remaining: 24 - ((i % 5) + 3),
  cover_image_url: projects[i % projects.length].cover_image_url,
  project_id: projects[i % 3].id,
  root_job_id: type === "event" ? id("event-job-" + title) : null,
}));
await put("activities", activities);
await put(
  "enrollments",
  activities.flatMap((a, i) =>
    talents
      .slice(0, (i % 5) + 3)
      .map((t) => ({
        id: id("enrollment-" + a.id + t.user),
        activity_id: a.id,
        student_id: t.user,
        status: "guest",
      })),
  ),
);
const conversations = talents
  .slice(0, 5)
  .map((t, i) => ({
    id: id("conversation-" + t.pro),
    type: "direct",
    context_type: "project",
    context_id: projects[i % 3].id,
    created_by: owner,
    status: "active",
    last_message_at: time(-i * 2),
    updated_at: time(-i * 2),
  }));
await put("conversations", conversations);
await put(
  "conversation_participants",
  conversations.flatMap((c, i) => [
    {
      id: id("participant-" + c.id + owner),
      conversation_id: c.id,
      user_id: owner,
      role: "casting",
      last_read_at: time(-30),
      muted: false,
      archived: false,
    },
    {
      id: id("participant-" + c.id + talents[i].user),
      conversation_id: c.id,
      user_id: talents[i].user,
      role: "dancer",
      last_read_at: time(-2),
      muted: false,
      archived: false,
    },
  ]),
);
const replies = [
  "Thanks for the details! I’m available for the callback on Thursday.",
  "Just updated my reel. Excited to hear more about the movement direction.",
  "The rehearsal dates work well for me. Shall I bring a partner?",
  "Thanks for including me in the shortlist. Happy to share more material.",
  "I’ve reviewed the dates and the fee. Everything looks good from my side.",
];
await put(
  "messages",
  conversations.flatMap((c, i) => [
    {
      id: id("message-1-" + c.id),
      conversation_id: c.id,
      sender_id: owner,
      body: `Hi ${talents[i].first}, we’d love to connect about ${projects[i % 3].title}. Would you be available to discuss the opportunity? (Fictional staging conversation.)`,
      message_type: "text",
      created_at: time(-26 - i),
    },
    {
      id: id("message-2-" + c.id),
      conversation_id: c.id,
      sender_id: talents[i].user,
      body: replies[i],
      message_type: "text",
      created_at: time(-i * 2 - 0.2),
    },
  ]),
);
await put(
  "notifications",
  [
    [
      "submissions",
      "New talent for Afterglow",
      "8 fictional applications are ready to explore.",
      "submission_received",
    ],
    [
      "callback",
      "Callback availability updated",
      "Jordan Reed is available for the callback session.",
      "availability_responded",
    ],
    [
      "roster",
      "Your tour roster is taking shape",
      "Review your saved performers and build the next team.",
      "talent_added_to_roster",
    ],
    [
      "event",
      "Studio Social is on the calendar",
      "Your October gathering is ready to manage.",
      "event_created",
    ],
    [
      "shortlist",
      "Kinetic shortlist updated",
      "Review the selected dancers before sharing with your client.",
      "talent_shortlisted",
    ],
  ].map(([key, title, body, type], i) => ({
    id: id("notification-" + key),
    user_id: owner,
    title,
    body,
    type,
    data: { demo: true, project_id: projects[i % 3].id },
    created_at: time(-i * 2),
    read_at: i > 2 ? time(-1) : null,
  })),
);
mkdirSync(".staging", { recursive: true });
writeFileSync(
  ".staging/demo-manifest.json",
  JSON.stringify(
    {
      version: 2,
      owner,
      projects: projects.map((p) => ({ id: p.id, title: p.title })),
      talents: talents.map((t) => ({
        user: t.user,
        profile: t.pro,
        name: t.name,
      })),
      activities: activities.map((a) => ({ id: a.id, title: a.title })),
    },
    null,
    2,
  ),
);
console.log(
  "Fictional industry workspace seeded. No production records or delivery credentials used.",
);
const files = [
  [
    "afterglow-creative-brief.txt",
    "Afterglow — Creative brief",
    "AFTERGLOW / FICTIONAL STAGING BRIEF\n\nA movement-led live show built around connection and release.\nCasting: 2 principal dancers, 6 ensemble dancers.\nLocation: Los Angeles.\nDirection: expressive performance, musicality, partnering.\n\nThis document contains only fictional demo content.",
  ],
  [
    "callback-running-order.txt",
    "Callback — Running order",
    "CALLBACK / FICTIONAL STAGING RUNNING ORDER\n\n10:00 Arrival and warm-up\n10:30 Phrase work\n11:15 Partnering\n12:00 Creative exploration\n12:45 Closing notes\n\nAll people, dates, and productions in this demo are fictional.",
  ],
  [
    "rehearsal-preparation.txt",
    "Rehearsal — Preparation notes",
    "REHEARSAL / FICTIONAL STAGING NOTES\n\nBring comfortable rehearsal wear, clean studio shoes, and water.\nReview the creative brief before arriving.\nThe first session focuses on ensemble timing and shared movement vocabulary.\n\nDemo content only.",
  ],
];
for (const [fileName, title, body] of files) {
  const path = `${owner}/inbox/demo-${fileName}`;
  const bytes = Buffer.from(body);
  const { error: uploadError } = await db.storage
    .from("project-media")
    .upload(path, bytes, { contentType: "text/plain", upsert: true });
  if (uploadError)
    throw new Error("Demo file upload failed: " + uploadError.message);
  const { data: url } = db.storage.from("project-media").getPublicUrl(path);
  await put("buyer_file_inbox", [
    {
      id: id("file-" + fileName),
      owner_id: owner,
      title,
      file_name: fileName,
      content_type: "text/plain",
      file_url: url.publicUrl,
      storage_path: path,
      size_bytes: bytes.length,
    },
  ]);
}
