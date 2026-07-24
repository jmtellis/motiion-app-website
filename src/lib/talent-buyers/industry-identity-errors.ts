export const INDUSTRY_IDENTITY_REQUIRED_CODE = "industry_identity_required" as const;

export function isIndustryIdentityRequiredError(
  result: { ok: boolean; code?: string; error?: string } | null | undefined,
): boolean {
  return Boolean(
    result &&
      !result.ok &&
      (result.code === INDUSTRY_IDENTITY_REQUIRED_CODE ||
        result.error?.includes("Verify your identity")),
  );
}
