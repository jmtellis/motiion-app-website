import { z } from "zod";

import { CREDIT_TYPES, SOURCE_TYPES, VERIFICATION_STATUSES } from "@/lib/talent-navigator/credit-types";
import { normalizeIndustryEntityName } from "@/lib/talent-navigator/normalize-entity-name";
import {
  displayCreditSourceLabel,
  displayVerificationLabel,
} from "@/lib/talent-navigator/normalize-entity-name";

export const TalentCreditWriteSchema = z.object({
  id: z.string().uuid().optional(),
  creditType: z.enum(CREDIT_TYPES),
  artistEntityId: z.string().uuid().nullable().optional(),
  choreographerEntityId: z.string().uuid().nullable().optional(),
  productionEntityId: z.string().uuid().nullable().optional(),
  artistName: z.string().trim().optional(),
  choreographerName: z.string().trim().optional(),
  productionName: z.string().trim().optional(),
  role: z.string().trim().nullable().optional(),
  productionNameFallback: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  creditYear: z.number().int().min(1950).max(2100).nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isPublic: z.boolean().default(true),
  isSearchable: z.boolean().default(true),
  sourceType: z.enum(SOURCE_TYPES).default("manual"),
  sourceReference: z.string().nullable().optional(),
  sourceText: z.string().nullable().optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
  verificationConfidence: z.number().min(0).max(1).nullable().optional(),
});

export type TalentCreditWriteInput = z.infer<typeof TalentCreditWriteSchema>;

export type TalentCreditRecord = {
  id: string;
  talentId: string;
  creditType: string;
  role: string | null;
  productionNameFallback: string | null;
  notes: string | null;
  creditYear: number | null;
  startDate: string | null;
  endDate: string | null;
  verificationStatus: string;
  verificationLabel: string;
  sourceType: string;
  sourceLabel: string;
  sourceText: string | null;
  isPublic: boolean;
  isSearchable: boolean;
  artistEntityId: string | null;
  choreographerEntityId: string | null;
  productionEntityId: string | null;
  artistName: string | null;
  choreographerName: string | null;
  productionName: string | null;
};

type EntityName = { canonical_name: string } | { canonical_name: string }[] | null;

function unwrapName(value: EntityName): string | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0]?.canonical_name ?? null) : value.canonical_name;
}

export function mapCreditRow(row: Record<string, unknown>): TalentCreditRecord {
  const verificationStatus = String(row.verification_status ?? "talent_reported");
  const sourceType = String(row.source_type ?? "manual");
  return {
    id: String(row.id),
    talentId: String(row.talent_id),
    creditType: String(row.credit_type),
    role: (row.role as string | null) ?? null,
    productionNameFallback: (row.production_name_fallback as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    creditYear: (row.credit_year as number | null) ?? null,
    startDate: (row.start_date as string | null) ?? null,
    endDate: (row.end_date as string | null) ?? null,
    verificationStatus,
    verificationLabel: displayVerificationLabel(verificationStatus),
    sourceType,
    sourceLabel: displayCreditSourceLabel(sourceType),
    sourceText: (row.source_text as string | null) ?? null,
    isPublic: Boolean(row.is_public),
    isSearchable: Boolean(row.is_searchable),
    artistEntityId: (row.artist_entity_id as string | null) ?? null,
    choreographerEntityId: (row.choreographer_entity_id as string | null) ?? null,
    productionEntityId: (row.production_entity_id as string | null) ?? null,
    artistName: unwrapName(row.artist as EntityName),
    choreographerName: unwrapName(row.choreographer as EntityName),
    productionName:
      unwrapName(row.production as EntityName) ??
      ((row.production_name_fallback as string | null) ?? null),
  };
}

export async function ensurePendingEntity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  name: string,
  entityType: "artist" | "choreographer" | "production" | "tour" | "other",
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const normalized = normalizeIndustryEntityName(trimmed);

  const { data: existing } = await client
    .from("industry_entities")
    .select("id")
    .eq("entity_type", entityType)
    .eq("normalized_name", normalized)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created, error } = await client
    .from("industry_entities")
    .insert({
      entity_type: entityType,
      canonical_name: trimmed,
      normalized_name: normalized,
      is_pending: true,
      is_verified: false,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("ensurePendingEntity failed:", error?.message);
    return null;
  }
  return created.id as string;
}

export async function writeAuditLog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  input: {
    actorId: string;
    actionType: string;
    resourceType: string;
    resourceId?: string | null;
    previousValue?: unknown;
    newValue?: unknown;
  },
) {
  await client.from("credit_audit_log").insert({
    actor_id: input.actorId,
    action_type: input.actionType,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    previous_value: input.previousValue ?? null,
    new_value: input.newValue ?? null,
  });
}

/** Talent-safe verification statuses (cannot self-assign high trust). */
export function clampTalentVerification(
  status: string | undefined,
  previous?: string,
): string {
  const allowed = new Set(["talent_reported", "ai_extracted", "unverified", "document_supported"]);
  if (status && allowed.has(status)) return status;
  if (previous && allowed.has(previous)) return previous;
  return "talent_reported";
}
