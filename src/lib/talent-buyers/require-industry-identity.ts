import { getIndustryIdentityVerificationByUserId } from "@/lib/billing/identity";
import { INDUSTRY_IDENTITY_REQUIRED_CODE } from "@/lib/talent-buyers/industry-identity-errors";

export {
  INDUSTRY_IDENTITY_REQUIRED_CODE,
  isIndustryIdentityRequiredError,
} from "@/lib/talent-buyers/industry-identity-errors";

export type IndustryIdentityGateResult =
  | { ok: true; verified: true }
  | {
      ok: false;
      code: typeof INDUSTRY_IDENTITY_REQUIRED_CODE;
      error: string;
      verified: false;
    };

/**
 * Server-side gate for high-trust industry actions (publish casting, contact talent).
 * Does not weaken existing auth — callers must still enforce account/session checks.
 */
export async function requireIndustryIdentityVerified(
  userId: string,
): Promise<IndustryIdentityGateResult> {
  const row = await getIndustryIdentityVerificationByUserId(userId);
  if (row?.status === "verified") {
    return { ok: true, verified: true };
  }

  return {
    ok: false,
    code: INDUSTRY_IDENTITY_REQUIRED_CODE,
    error: "Verify your identity to contact talent and publish opportunities.",
    verified: false,
  };
}
