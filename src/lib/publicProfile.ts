import { cache } from "react";
import { enrichProfileCreditMedia } from "@/lib/profile/enrich-credit-images";
import { buildProfileCredits, type ProfileCreditPageLayout } from "@/lib/profile/profile-credits";
import {
  normalizeProfileExperiences,
  normalizeProfileHighlights,
} from "@/lib/profile/profile-normalize";
import { resolveHighlightImageUrl } from "@/lib/profile/resume-experience";
import { PROFILE_SLUG_UUID_RE, normalizeUsernameSlug } from "@/lib/profileOg";
import { readLiveTalentRow } from "@/lib/catalog/live-catalog";
import { supabaseRestGet } from "@/lib/supabaseRest";
import type { PublicTalentProfile } from "@/types/public";

const TALENT_SELECT = [
  "id",
  "full_name",
  "username",
  "headshot_url",
  "headshot_urls",
  "location",
  "representation",
  "agency_logo_url",
  "gender",
  "ethnicity",
  "height",
  "union_status",
  "eye_color",
  "hair_color",
  "sizing",
  "skills",
  "styles",
  "talent_types",
  "profile_highlights",
  "experiences",
  "training",
  "profile_visuals",
  "resume_url",
  "instagram_url",
  "youtube_url",
  "credit_page_layout",
].join(",");

type TalentRow = PublicTalentProfile;

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

async function normalizeTalentRow(row: TalentRow): Promise<PublicTalentProfile> {
  const experiences = normalizeProfileExperiences(row.experiences);
  const creditPageLayout = parseCreditPageLayout(row.credit_page_layout);
  const baseCredits = buildProfileCredits(experiences);
  const enriched = await enrichProfileCreditMedia({
    experiences,
    credits: baseCredits,
    layout: creditPageLayout,
  });
  const profileHighlights = normalizeProfileHighlights(row.profile_highlights).map((highlight) => ({
    ...highlight,
    image_url: resolveHighlightImageUrl(highlight, enriched.experiences),
  }));

  return {
    ...row,
    date_of_birth: null, // This public page does not display birth dates.
    user_id: row.id,
    full_name: row.full_name?.trim() || null,
    username: row.username?.trim() || null,
    headshot_url: row.headshot_url?.trim() || row.headshot_urls?.[0]?.trim() || null,
    headshot_urls: row.headshot_urls ?? null,
    location: row.location?.trim() || null,
    representation: row.representation?.trim() || null,
    skills: parseStringArray(row.skills),
    styles: parseStringArray(row.styles),
    talent_types: parseStringArray(row.talent_types),
    experiences: enriched.experiences,
    profile_highlights: profileHighlights,
    credits: enriched.credits,
    credit_page_layout: creditPageLayout,
    training: Array.isArray(row.training) ? row.training : [],
    profile_visuals: Array.isArray(row.profile_visuals) ? row.profile_visuals : [],
  };
}

function parseCreditPageLayout(raw: unknown): ProfileCreditPageLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const visible = Array.isArray(record.visible_keys)
    ? record.visible_keys.filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    : [];
  const hidden = Array.isArray(record.hidden_keys)
    ? record.hidden_keys.filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    : [];
  if (!visible.length && !hidden.length) return null;
  return { visible_keys: visible, hidden_keys: hidden };
}

export const fetchPublicTalentProfile = cache(async (slug: string): Promise<PublicTalentProfile | null> => {
  const trimmed = decodeURIComponent(slug).trim();
  const isUuid = PROFILE_SLUG_UUID_RE.test(trimmed);
  const username = normalizeUsernameSlug(trimmed);

  if (!isUuid && username.length === 0) return null;

  const filter = isUuid
    ? `id=eq.${trimmed.toLowerCase()}`
    : `username=eq.${encodeURIComponent(username)}`;

  const rows = await supabaseRestGet<TalentRow[]>(
    `talent?${filter}&select=${TALENT_SELECT}&limit=1`,
    { revalidate: 0 },
  );

  if (rows?.length) return await normalizeTalentRow(rows[0]);
  const live = await readLiveTalentRow<TalentRow>(filter, TALENT_SELECT);
  if (live) return await normalizeTalentRow(live);
  if (rows === null) throw new Error("Couldn’t load this profile. Please try again.");
  return null;
});
