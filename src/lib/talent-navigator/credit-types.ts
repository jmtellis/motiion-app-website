import { z } from "zod";

export const CREDIT_TYPES = [
  "tour",
  "music_video",
  "live_performance",
  "commercial",
  "film",
  "television",
  "award_show",
  "event",
  "class",
  "training",
  "other",
] as const;

export const VERIFICATION_STATUSES = [
  "motiion_verified",
  "industry_confirmed",
  "document_supported",
  "talent_reported",
  "ai_extracted",
  "unverified",
] as const;

export const ENTITY_TYPES = [
  "artist",
  "choreographer",
  "creative_director",
  "production",
  "tour",
  "music_video",
  "live_performance",
  "commercial",
  "film",
  "television",
  "event",
  "agency",
  "other",
] as const;

export const SOURCE_TYPES = [
  "manual",
  "resume",
  "platform_booking",
  "industry_confirmation",
  "admin_import",
  "external_source",
  "other",
] as const;

export type CreditType = (typeof CREDIT_TYPES)[number];
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type EntityType = (typeof ENTITY_TYPES)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];

export type IndustryEntity = {
  id: string;
  entityType: EntityType;
  canonicalName: string;
  normalizedName: string;
  description?: string | null;
  imageUrl?: string | null;
  isVerified: boolean;
  isPending?: boolean;
};

export type EntityResolutionCandidate = {
  id: string;
  name: string;
  type: string;
  score: number;
};

export type EntityResolutionResult = {
  requestedName: string;
  status: "resolved" | "ambiguous" | "unresolved";
  role: "artist" | "choreographer" | "production";
  entity?: {
    id: string;
    name: string;
    type: string;
  };
  candidates?: EntityResolutionCandidate[];
};

export type CreditEvidence = {
  id: string;
  creditType: CreditType;
  role: string | null;
  productionName: string | null;
  artistName: string | null;
  choreographerName: string | null;
  creditYear: number | null;
  verificationStatus: VerificationStatus;
  sourceType: SourceType;
  sourceLabel: string;
  verificationLabel: string;
};

export type TalentCreditMatch = {
  talentId: string;
  matchingCredits: CreditEvidence[];
  matchingCreditCount: number;
  rankScore: number;
  highestVerification: VerificationStatus;
};

export const TalentNavigatorSearchSchema = z.object({
  artists: z.array(z.string()).default([]),
  choreographers: z.array(z.string()).default([]),
  productions: z.array(z.string()).default([]),
  resolvedArtistIds: z.array(z.string().uuid()).default([]),
  resolvedChoreographerIds: z.array(z.string().uuid()).default([]),
  resolvedProductionIds: z.array(z.string().uuid()).default([]),
  relationshipMatchMode: z.enum(["all", "any"]).default("all"),
  verificationStatuses: z.array(z.enum(VERIFICATION_STATUSES)).default([]),
  minimumMatchingCredits: z.number().int().min(1).default(1),
  location: z.array(z.string()).default([]),
  danceStyles: z.array(z.string()).default([]),
  agencies: z.array(z.string()).default([]),
  representedOnly: z.boolean().optional(),
  availableOnly: z.boolean().optional(),
  proOnly: z.boolean().optional(),
  verifiedProfilesOnly: z.boolean().optional(),
  broadExperienceQuery: z.string().optional(),
  sortBy: z
    .enum(["relevance", "verification", "recent_credit", "profile_strength"])
    .default("relevance"),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

export type TalentNavigatorSearchInput = z.infer<typeof TalentNavigatorSearchSchema>;

export const ExtractedCreditSchema = z.object({
  creditType: z.string(),
  artistName: z.string().optional(),
  choreographerName: z.string().optional(),
  productionName: z.string().optional(),
  role: z.string().optional(),
  year: z.number().int().optional(),
  sourceText: z.string(),
  confidence: z.number().min(0).max(1),
});

export type ExtractedCredit = z.infer<typeof ExtractedCreditSchema>;
