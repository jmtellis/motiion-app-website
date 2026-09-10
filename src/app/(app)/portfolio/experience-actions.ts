"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensurePendingEntity } from "@/lib/talent-navigator/credit-management";

const experienceSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Title is required."),
  role: z.string().trim().optional(),
  credits: z.string().trim().optional(),
  category: z.string().trim().optional(),
  start_date: z.string().trim().optional(),
  end_date: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  link_url: z.string().trim().optional(),
});

export type ExperienceCredit = z.infer<typeof experienceSchema>;

function withIds(experiences: ExperienceCredit[]): ExperienceCredit[] {
  return experiences.map((item, index) => ({
    ...item,
    id: item.id || `exp_${index}_${Buffer.from(item.title).toString("base64url").slice(0, 8)}`,
  }));
}

async function readExperiences(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("experiences")
    .eq("user_id", userId)
    .maybeSingle<{ experiences: unknown }>();
  if (error) throw new Error(error.message);
  const raw = Array.isArray(data?.experiences) ? data.experiences : [];
  return withIds(
    raw.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      if (!title) return [];
      const experience: ExperienceCredit = {
        title,
        id: typeof row.id === "string" ? row.id : undefined,
        role: typeof row.role === "string" ? row.role : undefined,
        credits: typeof row.credits === "string" ? row.credits : undefined,
        category: typeof row.category === "string" ? row.category : undefined,
        start_date: typeof row.start_date === "string" ? row.start_date : undefined,
        end_date: typeof row.end_date === "string" ? row.end_date : undefined,
        notes: typeof row.notes === "string" ? row.notes : undefined,
        link_url: typeof row.link_url === "string" ? row.link_url : undefined,
      };
      return [experience];
    }),
  );
}

/** Best-effort projection into talent_credits for Talent Navigator search. */
async function projectExperienceToTalentCredits(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  userId: string,
  experience: ExperienceCredit,
) {
  try {
    const productionName = experience.title;
    const productionEntityId = productionName
      ? await ensurePendingEntity(supabase, productionName, "production")
      : null;
    const year = experience.start_date?.match(/\d{4}/)?.[0];
    await supabase.from("talent_credits").insert({
      talent_id: userId,
      credit_type: experience.category || "other",
      role: experience.role ?? null,
      production_name_fallback: productionName,
      production_entity_id: productionEntityId,
      notes: experience.notes ?? experience.credits ?? null,
      credit_year: year ? Number(year) : null,
      source_type: "talent_reported",
      source_text: experience.id ?? null,
      verification_status: "talent_reported",
      is_public: true,
      is_searchable: true,
      created_by: userId,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Projection is best-effort; experiences remain canonical.
  }
}

export async function listOwnExperiences(): Promise<{
  experiences: ExperienceCredit[];
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { experiences: [], error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { experiences: [], error: "You must be signed in." };

  try {
    return { experiences: await readExperiences(supabase, user.id) };
  } catch (error) {
    return {
      experiences: [],
      error: error instanceof Error ? error.message : "Couldn't load credits.",
    };
  }
}

export async function upsertOwnExperience(
  raw: unknown,
): Promise<{ experiences?: ExperienceCredit[]; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = experienceSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credit." };
  }

  const current = await readExperiences(supabase, user.id);
  const nextItem = {
    ...parsed.data,
    id: parsed.data.id || `exp_${Date.now().toString(36)}`,
  };
  const experiences = current.some((item) => item.id === nextItem.id)
    ? current.map((item) => (item.id === nextItem.id ? nextItem : item))
    : [...current, nextItem];

  const { error } = await supabase
    .from("profiles")
    .update({ experiences, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await projectExperienceToTalentCredits(supabase, user.id, nextItem);
  await trackServerEvent("talent_credit_added", { store: "experiences" });
  revalidatePath("/portfolio");
  revalidatePath("/home");
  revalidatePath("/profile/setup");
  return { experiences };
}

export async function deleteOwnExperience(
  experienceId: string,
): Promise<{ experiences?: ExperienceCredit[]; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const current = await readExperiences(supabase, user.id);
  const experiences = current.filter((item) => item.id !== experienceId);

  const { error } = await supabase
    .from("profiles")
    .update({ experiences, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  try {
    await supabase
      .from("talent_credits")
      .delete()
      .eq("talent_id", user.id)
      .eq("source_text", experienceId);
  } catch {
    // Best-effort index cleanup.
  }

  revalidatePath("/portfolio");
  revalidatePath("/home");
  revalidatePath("/profile/setup");
  return { experiences };
}