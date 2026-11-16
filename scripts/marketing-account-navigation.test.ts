import assert from "node:assert/strict";
import { test } from "node:test";
import { marketingAccountAction } from "../src/lib/marketing/account-navigation";
const base = { signedIn: true, industry: true, approved: false, setupComplete: false, destination: "/talent-buyers/onboarding" };
test("visitors get login; pending industry accounts return to their application", () => {
  assert.deepEqual(marketingAccountAction({ ...base, signedIn: false }), { label: "Log in", href: "/login" });
  assert.deepEqual(marketingAccountAction(base), { label: "Account", href: "/talent-buyers/application" });
  assert.equal(marketingAccountAction({ ...base, setupComplete: true }).label, "Account");
});
test("approved accounts can finish setup or return directly to the workspace", () => {
  assert.deepEqual(marketingAccountAction({ ...base, approved: true }), { label: "Dashboard", href: "/dashboard", completeSetup: true });
  assert.deepEqual(marketingAccountAction({ ...base, approved: true, setupComplete: true }), { label: "Dashboard", href: "/dashboard", completeSetup: false });
});
test("talent and community retain their own setup and workspace destinations", () => {
  assert.deepEqual(marketingAccountAction({ ...base, industry: false, destination: "/onboarding" }), { label: "Account", href: "/onboarding" });
  assert.deepEqual(marketingAccountAction({ ...base, industry: false, setupComplete: true, destination: "/home" }), { label: "Dashboard", href: "/home" });
});
