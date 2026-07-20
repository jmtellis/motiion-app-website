import {
  displayCreditSourceLabel,
  displayVerificationLabel,
} from "@/lib/talent-navigator/normalize-entity-name";
import type {
  CreditEvidence,
  CreditType,
  SourceType,
  VerificationStatus,
} from "@/lib/talent-navigator/credit-types";
import type { Talent } from "@/lib/talent-navigator/types";

export type CreditSearchResultTalent = Talent & {
  matchingCredits: CreditEvidence[];
  matchingCreditCount: number;
  rankScore: number;
};

type CreditRow = {
  id: string;
  talent_id: string;
  credit_type: string;
  role: string | null;
  production_name_fallback: string | null;
  credit_year: number | null;
  verification_status: string;
  source_type: string;
  artist?: { canonical_name: string } | { canonical_name: string }[] | null;
  choreographer?: { canonical_name: string } | { canonical_name: string }[] | null;
  production?: { canonical_name: string } | { canonical_name: string }[] | null;
};

function entityName(
  value: { canonical_name: string } | { canonical_name: string }[] | null | undefined,
): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.canonical_name ?? null;
  return value.canonical_name;
}

export function creditRowToEvidence(row: CreditRow): CreditEvidence {
  const verificationStatus = row.verification_status as VerificationStatus;
  const sourceType = row.source_type as SourceType;
  return {
    id: row.id,
    creditType: row.credit_type as CreditType,
    role: row.role,
    productionName: entityName(row.production) ?? row.production_name_fallback,
    artistName: entityName(row.artist),
    choreographerName: entityName(row.choreographer),
    creditYear: row.credit_year,
    verificationStatus,
    sourceType,
    sourceLabel: displayCreditSourceLabel(sourceType),
    verificationLabel: displayVerificationLabel(verificationStatus),
  };
}

export function attachEvidenceToTalent(
  talent: Talent,
  evidence: CreditEvidence[],
  rankScore: number,
): CreditSearchResultTalent {
  return {
    ...talent,
    matchingCredits: evidence,
    matchingCreditCount: evidence.length,
    rankScore,
    credits: evidence
      .map((item) => item.productionName || item.artistName || item.choreographerName)
      .filter(Boolean) as string[],
  };
}

export function formatEvidenceSummary(evidence: CreditEvidence): string {
  const parts = [
    evidence.productionName,
    evidence.role ? `— ${evidence.role}` : null,
  ].filter(Boolean);
  const people = [
    evidence.artistName ? `Artist: ${evidence.artistName}` : null,
    evidence.choreographerName ? `Choreographer: ${evidence.choreographerName}` : null,
    evidence.creditYear ? String(evidence.creditYear) : null,
    evidence.verificationLabel,
  ].filter(Boolean);
  return `${parts.join(" ")} · ${people.join(" · ")}`;
}
