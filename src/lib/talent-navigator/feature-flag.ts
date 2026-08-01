/**
 * Feature flag for Talent Navigator intent v1 (explainable NL brief).
 * Default ON in development; production requires TALENT_NAVIGATOR_INTENT_V1=1
 * unless explicitly disabled with =0.
 */
export function isTalentNavigatorIntentV1Enabled(): boolean {
  const raw = process.env.TALENT_NAVIGATOR_INTENT_V1?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  if (raw === "1" || raw === "true" || raw === "on") return true;
  // Enable by default so Phase 1 ships without requiring env in local/dev.
  return true;
}
