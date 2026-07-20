"use server";

import { revalidatePath } from "next/cache";

import { trackServerEvent } from "@/lib/analytics/track-server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  TalentCreditWriteSchema,
  clampTalentVerification,
  ensurePendingEntity,
  mapCreditRow,
  writeAuditLog,
  type TalentCreditRecord,
} from "@/lib/talent-navigator/credit-management";
import { normalizeIndustryEntityName } from "@/lib/talent-navigator/normalize-entity-name";

const CREDIT_SELECT = `
  id,
  talent_id,
  credit_type,
  role,
  production_name_fallback,
  notes,
  credit_year,
  start_date,
  end_date,
  verification_status,
  source_type,
  source_text,
  is_public,
  is_searchable,
  artist_entity_id,
  choreographer_entity_id,
  production_entity_id,
  artist:industry_entities!talent_credits_artist_entity_id_fkey(canonical_name),
  choreographer:industry_entities!talent_credits_choreographer_entity_id_fkey(canonical_name),
  production:industry_entities!talent_credits_production_entity_id_fkey(canonical_name)
`;

export async function listOwnTalentCredits(): Promise<{
  credits: TalentCreditRecord[];
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { credits: [], error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { credits: [], error: "You must be signed in." };

  const { data, error } = await supabase
    .from("talent_credits")
    .select(CREDIT_SELECT)
    .eq("talent_id", user.id)
    .order("credit_year", { ascending: false, nullsFirst: false });

  if (error) return { credits: [], error: error.message };
  return { credits: (data ?? []).map((row) => mapCreditRow(row as Record<string, unknown>)) };
}

export async function searchIndustryEntities(input: {
  query: string;
  entityType?: string;
  limit?: number;
}): Promise<{
  entities: Array<{ id: string; name: string; type: string; pending: boolean }>;
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { entities: [], error: "Supabase is not configured." };

  const q = normalizeIndustryEntityName(input.query);
  if (!q) return { entities: [] };

  let query = supabase
    .from("industry_entities")
    .select("id, canonical_name, entity_type, is_pending")
    .ilike("normalized_name", `%${q}%`)
    .limit(input.limit ?? 12);

  if (input.entityType) {
    query = query.eq("entity_type", input.entityType);
  }

  const { data, error } = await query;
  if (error) return { entities: [], error: error.message };

  return {
    entities: (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.canonical_name as string,
      type: row.entity_type as string,
      pending: Boolean(row.is_pending),
    })),
  };
}

export async function upsertOwnTalentCredit(
  raw: unknown,
): Promise<{ credit?: TalentCreditRecord; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const parsed = TalentCreditWriteSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid credit." };

  const input = parsed.data;
  let artistEntityId = input.artistEntityId ?? null;
  let choreographerEntityId = input.choreographerEntityId ?? null;
  let productionEntityId = input.productionEntityId ?? null;

  if (!artistEntityId && input.artistName) {
    artistEntityId = await ensurePendingEntity(supabase, input.artistName, "artist");
  }
  if (!choreographerEntityId && input.choreographerName) {
    choreographerEntityId = await ensurePendingEntity(
      supabase,
      input.choreographerName,
      "choreographer",
    );
  }
  if (!productionEntityId && input.productionName) {
    productionEntityId = await ensurePendingEntity(supabase, input.productionName, "production");
  }

  const payload = {
    talent_id: user.id,
    credit_type: input.creditType,
    artist_entity_id: artistEntityId,
    choreographer_entity_id: choreographerEntityId,
    production_entity_id: productionEntityId,
    role: input.role ?? null,
    production_name_fallback: input.productionNameFallback ?? input.productionName ?? null,
    notes: input.notes ?? null,
    credit_year: input.creditYear ?? null,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    is_public: input.isPublic,
    is_searchable: input.isSearchable,
    source_type: input.sourceType,
    source_reference: input.sourceReference ?? null,
    source_text: input.sourceText ?? null,
    verification_status: clampTalentVerification(input.verificationStatus),
    verification_confidence: input.verificationConfidence ?? null,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data: previous } = await supabase
      .from("talent_credits")
      .select("*")
      .eq("id", input.id)
      .eq("talent_id", user.id)
      .maybeSingle();

    if (!previous) return { error: "Credit not found." };

    const { data, error } = await supabase
      .from("talent_credits")
      .update({
        ...payload,
        verification_status: clampTalentVerification(
          input.verificationStatus,
          previous.verification_status as string,
        ),
      })
      .eq("id", input.id)
      .eq("talent_id", user.id)
      .select(CREDIT_SELECT)
      .single();

    if (error) return { error: error.message };
    await writeAuditLog(supabase, {
      actorId: user.id,
      actionType: "credit_edited",
      resourceType: "talent_credit",
      resourceId: input.id,
      previousValue: previous,
      newValue: data,
    });
    revalidatePath("/portfolio");
    return { credit: mapCreditRow(data as Record<string, unknown>) };
  }

  const { data, error } = await supabase
    .from("talent_credits")
    .insert(payload)
    .select(CREDIT_SELECT)
    .single();

  if (error) return { error: error.message };
  await writeAuditLog(supabase, {
    actorId: user.id,
    actionType: "credit_created",
    resourceType: "talent_credit",
    resourceId: data.id as string,
    newValue: data,
  });
  await trackServerEvent("talent_credit_added", { creditType: input.creditType });
  revalidatePath("/portfolio");
  return { credit: mapCreditRow(data as Record<string, unknown>) };
}

export async function deleteOwnTalentCredit(
  creditId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const { data: previous } = await supabase
    .from("talent_credits")
    .select("*")
    .eq("id", creditId)
    .eq("talent_id", user.id)
    .maybeSingle();

  if (!previous) return { ok: false, error: "Credit not found." };

  const { error } = await supabase
    .from("talent_credits")
    .delete()
    .eq("id", creditId)
    .eq("talent_id", user.id);

  if (error) return { ok: false, error: error.message };

  await writeAuditLog(supabase, {
    actorId: user.id,
    actionType: "credit_deleted",
    resourceType: "talent_credit",
    resourceId: creditId,
    previousValue: previous,
  });
  revalidatePath("/portfolio");
  return { ok: true };
}

export async function acceptExtractedCredit(
  creditId: string,
): Promise<{ credit?: TalentCreditRecord; error?: string }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: previous } = await supabase
    .from("talent_credits")
    .select("*")
    .eq("id", creditId)
    .eq("talent_id", user.id)
    .eq("verification_status", "ai_extracted")
    .maybeSingle();

  if (!previous) return { error: "Extracted credit not found." };

  const { data, error } = await supabase
    .from("talent_credits")
    .update({
      verification_status: "talent_reported",
      is_searchable: true,
      is_public: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", creditId)
    .select(CREDIT_SELECT)
    .single();

  if (error) return { error: error.message };
  await writeAuditLog(supabase, {
    actorId: user.id,
    actionType: "credit_extraction_accepted",
    resourceType: "talent_credit",
    resourceId: creditId,
    previousValue: previous,
    newValue: data,
  });
  await trackServerEvent("talent_credit_extraction_accepted", {});
  revalidatePath("/portfolio");
  return { credit: mapCreditRow(data as Record<string, unknown>) };
}

export async function rejectExtractedCredit(
  creditId: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await deleteOwnTalentCredit(creditId);
  if (result.ok) {
    await trackServerEvent("talent_credit_extraction_rejected", {});
  }
  return result;
}
