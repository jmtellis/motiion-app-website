/**
 * MOT-82 first-journey identity fee rules.
 * Pure decisions only — no Stripe or database imports — so unit tests can load this module.
 */

export const IDENTITY_VERIFICATION_FEE_PURPOSE = "identity_verification_fee";

/** Internal budget granted by one successful Free fee payment. Not a second purchase. */
export const IDENTITY_FEE_ATTEMPT_GRANT = 2;

export type IdentityVerificationAudience =
  | "talent"
  | "dual"
  | "community"
  | "industry"
  | "unknown";

export type IdentityStartDecision =
  | { action: "already_verified" }
  | { action: "not_eligible" }
  | { action: "resume" }
  | { action: "allow_pro" }
  | { action: "fee_required" }
  | { action: "rate_limited" }
  | { action: "allow_free_decrement" };

export type FeeCreateDecision =
  | { action: "allow" }
  | { action: "already_verified" }
  | { action: "not_eligible" }
  | { action: "pro_included" }
  | { action: "fee_already_active" };

export type IdentityFeeHttpError = {
  status: number;
  code: string;
  error: string;
};

function normalized(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function shellSet(shells: readonly string[] | null | undefined): Set<string> {
  const values = new Set<string>();
  for (const shell of shells ?? []) {
    const trimmed = shell.trim();
    if (trimmed) values.add(trimmed);
  }
  return values;
}

/**
 * Talent and Dual (talent side) may start Identity. Community and Industry-only are out of v1.
 * Profiles with no account type and no shells stay on the legacy Talent path.
 */
export function identityVerificationAudience(input: {
  accountType: string | null | undefined;
  enabledShells: readonly string[] | null | undefined;
}): IdentityVerificationAudience {
  const account = normalized(input.accountType);
  const shells = shellSet(input.enabledShells);
  const talent = account === "talent" || shells.has("talent");
  const community = account === "community" || shells.has("community");
  const industry = account === "lookingForTalent" ||
    account === "looking_for_talent" ||
    shells.has("lookingForTalent");

  if (community && !talent) return "community";
  if (talent && industry) return "dual";
  if (talent) return "talent";
  if (industry) return "industry";
  if (!account && shells.size === 0) return "talent";
  return "unknown";
}

export function isIdentityVerificationAudienceEligible(
  audience: IdentityVerificationAudience,
): boolean {
  return audience === "talent" || audience === "dual";
}

/** Durable first-journey unlock. Attempts reaching 0 must not clear this. */
export function isIdentityFeeUnlocked(input: {
  feeUnlockedAt: string | null | undefined;
  feePaidAt: string | null | undefined;
}): boolean {
  return Boolean(normalized(input.feeUnlockedAt) || normalized(input.feePaidAt));
}

export function isIdentityVerificationFeePurpose(
  purpose: string | null | undefined,
): boolean {
  return purpose === IDENTITY_VERIFICATION_FEE_PURPOSE;
}

/**
 * Gate a new VerificationSession. Resume is decided by the caller from the live Stripe session
 * and must not decrement or charge. Verified is permanent and wins over audience and plan.
 */
export function decideIdentityStart(input: {
  status: string | null | undefined;
  audience: IdentityVerificationAudience;
  canResumeInFlight: boolean;
  isEffectivePro: boolean;
  feeUnlocked: boolean;
  attemptsRemaining: number;
}): IdentityStartDecision {
  const status = normalized(input.status).toLowerCase();
  if (status === "verified") return { action: "already_verified" };
  if (!isIdentityVerificationAudienceEligible(input.audience)) {
    return { action: "not_eligible" };
  }
  if (input.canResumeInFlight) return { action: "resume" };
  if (input.isEffectivePro) return { action: "allow_pro" };
  if (!input.feeUnlocked) return { action: "fee_required" };
  const attempts = Number.isFinite(input.attemptsRemaining)
    ? Math.trunc(input.attemptsRemaining)
    : 0;
  if (attempts < 1) return { action: "rate_limited" };
  return { action: "allow_free_decrement" };
}

/** No second purchase: verified, Pro, and already-unlocked Free users cannot create another fee. */
export function decideFeeCreate(input: {
  status: string | null | undefined;
  audience: IdentityVerificationAudience;
  isEffectivePro: boolean;
  feeUnlocked: boolean;
}): FeeCreateDecision {
  const status = normalized(input.status).toLowerCase();
  if (status === "verified") return { action: "already_verified" };
  if (!isIdentityVerificationAudienceEligible(input.audience)) {
    return { action: "not_eligible" };
  }
  if (input.isEffectivePro) return { action: "pro_included" };
  if (input.feeUnlocked) return { action: "fee_already_active" };
  return { action: "allow" };
}

export function feeCreateHttpError(decision: FeeCreateDecision): IdentityFeeHttpError | null {
  switch (decision.action) {
    case "allow":
      return null;
    case "already_verified":
      return {
        status: 409,
        code: "ALREADY_VERIFIED",
        error: "Identity already verified",
      };
    case "not_eligible":
      return {
        status: 403,
        code: "NOT_ELIGIBLE",
        error: "Identity verification is available for Talent profiles.",
      };
    case "pro_included":
      return {
        status: 409,
        code: "PRO_INCLUDED",
        error: "Identity verification is included with Talent Pro.",
      };
    case "fee_already_active":
      return {
        status: 409,
        code: "FEE_ALREADY_ACTIVE",
        error: "Your identity verification is already unlocked.",
      };
  }
}

export function identityStartHttpError(
  decision: IdentityStartDecision,
): IdentityFeeHttpError | null {
  switch (decision.action) {
    case "already_verified":
      return {
        status: 409,
        code: "ALREADY_VERIFIED",
        error: "Identity already verified",
      };
    case "not_eligible":
      return {
        status: 403,
        code: "NOT_ELIGIBLE",
        error: "Identity verification is available for Talent profiles.",
      };
    case "fee_required":
      return {
        status: 402,
        code: "FEE_REQUIRED",
        error: "A one-time identity verification fee is required before this check.",
      };
    case "rate_limited":
      return {
        status: 429,
        code: "RATE_LIMITED",
        error:
          "You've used the included attempts for this identity check. You won't be charged again. Try again later.",
      };
    case "resume":
    case "allow_pro":
    case "allow_free_decrement":
      return null;
  }
}

/** New unique payment adds the internal budget. Replays of the same payment do not. */
export function attemptsAfterFeePayment(current: number, isNewPayment: boolean): number {
  const base = Number.isFinite(current) ? Math.max(0, Math.trunc(current)) : 0;
  return isNewPayment ? base + IDENTITY_FEE_ATTEMPT_GRANT : base;
}

/** New VerificationSession spends one internal attempt. Null means the budget is exhausted. */
export function attemptsAfterNewSession(current: number): number | null {
  const base = Number.isFinite(current) ? Math.trunc(current) : 0;
  if (base < 1) return null;
  return base - 1;
}
