import assert from "node:assert/strict";
import { test } from "node:test";
import { buyerProfileEditSchema, buyerVerificationLinksSchema, normalizeProfessionalLink, reviewedIndustryIdentity } from "../src/lib/talent-buyers/profile-edit";
import { toDashboardProfile } from "../src/lib/auth/profile";
import type { ProfileRecord } from "../src/types/database";
const profile: ProfileRecord = { user_id: "one", email: "login@example.invalid", first_name: "Alex", last_name: "Example", display_name: "Alex Example", account_type: "talent", username: "alex", talent_types: ["dancer"], headshot_urls: ["https://example.com/talent.jpg"], industry_avatar_url: "https://example.com/industry.jpg", onboarding_completed_at: "2026-01-01", enabled_shells: ["talent", "lookingForTalent"], active_shell: "talent" };
test("professional and talent avatars follow the active shell without overwriting portfolio media", () => {
  assert.equal(toDashboardProfile(profile).avatarUrl, "https://example.com/talent.jpg");
  assert.equal(toDashboardProfile({ ...profile, active_shell: "lookingForTalent" }).avatarUrl, "https://example.com/industry.jpg");
  assert.equal(toDashboardProfile({ ...profile, active_shell: "lookingForTalent", industry_avatar_url: null }).avatarUrl, "https://example.com/talent.jpg");
});
test("work contact and verified sign-in emails remain distinct", () => {
  const value = toDashboardProfile(profile, { id: "one", company_name: "Independent", non_talent_type: "producer", work_email: "work@example.invalid" });
  assert.equal(value.email, "login@example.invalid");
  assert.equal(value.workEmail, "work@example.invalid");
});
test("professional links normalize domains and reject credentials, whitespace, or executable schemes", () => {
  assert.equal(normalizeProfessionalLink("example.com/credits"), "https://example.com/credits");
  for (const input of ["javascript:alert(1)", "data:text/html,hello", "https://user:secret@example.com", "https://exa mple.com", "not a url", "file:///tmp/test"]) {
    assert.equal(normalizeProfessionalLink(input), undefined);
    assert.equal(buyerVerificationLinksSchema.safeParse({ companyWebsite: input }).success, false);
  }
  assert.equal(buyerVerificationLinksSchema.safeParse({ companyWebsite: "", linkedin: undefined }).success, true);
});
test("professional profile editing retains legacy roles and requires an explicit custom role", () => {
  const input = { fullName: "Alex Example", organizationWebsite: "example.com", email: "contact@example.invalid", buyerRole: "producer", markets: ["Los Angeles"] };
  const parsed = buyerProfileEditSchema.parse(input);
  assert.equal(parsed.buyerRole, "producer");
  assert.equal(parsed.organizationWebsite, "https://example.com/");
  assert.equal(buyerProfileEditSchema.safeParse({ ...input, buyerRole: "other" }).success, false);
  assert.equal(buyerProfileEditSchema.safeParse({ ...input, buyerRole: "other", customRole: "Creative collaborator" }).success, true);
});

test("approved setup replaces an incomplete bootstrap name while preserving completed talent identity", () => {
  assert.deepEqual(reviewedIndustryIdentity("  Avery Quinn  ", null), { display_name: "Avery Quinn", first_name: "Avery", last_name: "Quinn" });
  assert.deepEqual(reviewedIndustryIdentity("Avery", null), { display_name: "Avery", first_name: "Avery", last_name: "" });
  assert.equal(reviewedIndustryIdentity("Avery Quinn", "2026-01-01"), null);
  assert.equal(reviewedIndustryIdentity("", null), null);
});
