import type { VerificationStatus } from "@/lib/talent-navigator/credit-types";

export const VERIFICATION_WEIGHT: Record<VerificationStatus, number> = {
  motiion_verified: 1.0,
  industry_confirmed: 0.9,
  document_supported: 0.75,
  talent_reported: 0.55,
  ai_extracted: 0.35,
  unverified: 0.2,
};

export function verificationStrength(status: VerificationStatus): number {
  return VERIFICATION_WEIGHT[status] ?? 0.2;
}

export function pickHighestVerification(
  statuses: VerificationStatus[],
): VerificationStatus {
  if (!statuses.length) return "unverified";
  return statuses.reduce((best, current) =>
    verificationStrength(current) > verificationStrength(best) ? current : best,
  );
}

export function scoreCreditMatch(input: {
  matchingCreditCount: number;
  verificationStatuses: VerificationStatus[];
  latestCreditYear: number | null;
  profileCompleteness?: number;
  existingRelevance?: number;
  semanticSimilarity?: number;
}): number {
  const verificationAvg =
    input.verificationStatuses.length === 0
      ? 0
      : input.verificationStatuses.reduce((sum, status) => sum + verificationStrength(status), 0) /
        input.verificationStatuses.length;

  const year = input.latestCreditYear ?? 2000;
  const recency = Math.max(0, Math.min(1, (year - 2000) / 26));

  return (
    input.matchingCreditCount * 2 +
    verificationAvg * 5 +
    recency * 2 +
    (input.profileCompleteness ?? 0) * 1.5 +
    (input.existingRelevance ?? 0) +
    (input.semanticSimilarity ?? 0) * 0.5
  );
}
