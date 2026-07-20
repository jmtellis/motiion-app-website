"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { normalizeIndustryEntityName } from "@/lib/talent-navigator/normalize-entity-name";
import { writeAuditLog } from "@/lib/talent-navigator/credit-management";

export async function adminSearchEntities(query: string) {
  await requirePlatformAdmin();
  const admin = createAdminSupabaseClient();
  if (!admin) return { entities: [], error: "Admin client unavailable." };

  const normalized = normalizeIndustryEntityName(query);
  let builder = admin
    .from("industry_entities")
    .select("id, entity_type, canonical_name, normalized_name, is_verified, is_pending, created_at")
    .order("canonical_name")
    .limit(50);

  if (normalized) {
    builder = builder.ilike("normalized_name", `%${normalized}%`);
  }

  const { data, error } = await builder;
  if (error) return { entities: [], error: error.message };
  return { entities: data ?? [] };
}

export async function adminCreateEntity(input: {
  entityType: string;
  canonicalName: string;
  isVerified?: boolean;
}) {
  const session = await requirePlatformAdmin();
  const admin = createAdminSupabaseClient();
  if (!admin) return { error: "Admin client unavailable." };

  const normalized = normalizeIndustryEntityName(input.canonicalName);
  const { data, error } = await admin
    .from("industry_entities")
    .insert({
      entity_type: input.entityType,
      canonical_name: input.canonicalName.trim(),
      normalized_name: normalized,
      is_verified: Boolean(input.isVerified),
      is_pending: false,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  await writeAuditLog(admin, {
    actorId: session.id,
    actionType: "entity_created",
    resourceType: "industry_entity",
    resourceId: data.id as string,
    newValue: input,
  });
  revalidatePath("/admin/entities");
  return { id: data.id as string };
}

export async function adminAddAlias(input: { entityId: string; alias: string }) {
  const session = await requirePlatformAdmin();
  const admin = createAdminSupabaseClient();
  if (!admin) return { error: "Admin client unavailable." };

  const { error } = await admin.from("industry_entity_aliases").insert({
    entity_id: input.entityId,
    alias: input.alias.trim(),
    normalized_alias: normalizeIndustryEntityName(input.alias),
  });
  if (error) return { error: error.message };

  await writeAuditLog(admin, {
    actorId: session.id,
    actionType: "alias_added",
    resourceType: "industry_entity",
    resourceId: input.entityId,
    newValue: input,
  });
  revalidatePath("/admin/entities");
  return { ok: true };
}

export async function adminMergeEntities(input: {
  keepEntityId: string;
  mergeEntityId: string;
}) {
  const session = await requirePlatformAdmin();
  const admin = createAdminSupabaseClient();
  if (!admin) return { error: "Admin client unavailable." };
  if (input.keepEntityId === input.mergeEntityId) {
    return { error: "Cannot merge an entity into itself." };
  }

  const updates = [
    admin
      .from("talent_credits")
      .update({ artist_entity_id: input.keepEntityId })
      .eq("artist_entity_id", input.mergeEntityId),
    admin
      .from("talent_credits")
      .update({ choreographer_entity_id: input.keepEntityId })
      .eq("choreographer_entity_id", input.mergeEntityId),
    admin
      .from("talent_credits")
      .update({ production_entity_id: input.keepEntityId })
      .eq("production_entity_id", input.mergeEntityId),
    admin
      .from("talent_credits")
      .update({ creative_director_entity_id: input.keepEntityId })
      .eq("creative_director_entity_id", input.mergeEntityId),
    admin
      .from("industry_entity_aliases")
      .update({ entity_id: input.keepEntityId })
      .eq("entity_id", input.mergeEntityId),
  ];

  for (const promise of updates) {
    const { error } = await promise;
    if (error) return { error: error.message };
  }

  const { data: mergeEntity } = await admin
    .from("industry_entities")
    .select("canonical_name, normalized_name")
    .eq("id", input.mergeEntityId)
    .maybeSingle();

  if (mergeEntity) {
    await admin.from("industry_entity_aliases").insert({
      entity_id: input.keepEntityId,
      alias: mergeEntity.canonical_name as string,
      normalized_alias: mergeEntity.normalized_name as string,
    });
  }

  const { error: deleteError } = await admin
    .from("industry_entities")
    .delete()
    .eq("id", input.mergeEntityId);

  if (deleteError) return { error: deleteError.message };

  await writeAuditLog(admin, {
    actorId: session.id,
    actionType: "entity_merged",
    resourceType: "industry_entity",
    resourceId: input.keepEntityId,
    previousValue: { mergedId: input.mergeEntityId },
    newValue: { keepEntityId: input.keepEntityId },
  });
  revalidatePath("/admin/entities");
  return { ok: true };
}

export async function adminUpdateCreditVerification(input: {
  creditId: string;
  verificationStatus: string;
}) {
  const session = await requirePlatformAdmin();
  const admin = createAdminSupabaseClient();
  if (!admin) return { error: "Admin client unavailable." };

  const { data: previous } = await admin
    .from("talent_credits")
    .select("*")
    .eq("id", input.creditId)
    .maybeSingle();

  const { error } = await admin
    .from("talent_credits")
    .update({
      verification_status: input.verificationStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.creditId);

  if (error) return { error: error.message };

  await writeAuditLog(admin, {
    actorId: session.id,
    actionType: "verification_status_changed",
    resourceType: "talent_credit",
    resourceId: input.creditId,
    previousValue: previous,
    newValue: { verification_status: input.verificationStatus },
  });
  revalidatePath("/admin/entities");
  return { ok: true };
}

export async function adminListPendingEntities() {
  await requirePlatformAdmin();
  const admin = createAdminSupabaseClient();
  if (!admin) return { entities: [], error: "Admin client unavailable." };

  const { data, error } = await admin
    .from("industry_entities")
    .select("id, entity_type, canonical_name, is_pending, created_at")
    .eq("is_pending", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { entities: [], error: error.message };
  return { entities: data ?? [] };
}
