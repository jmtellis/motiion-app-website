import assert from "node:assert/strict";
import test from "node:test";
import { accountSessionChanged } from "../src/lib/auth/account-session";

test("normal sign-in broadcasts and token refresh retain the same account's forms", () => {
  for (const event of ["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "PASSWORD_RECOVERY"]) {
    assert.equal(accountSessionChanged(event, "account-a", "account-a"), false);
  }
});

test("another browser tab's account switch invalidates the protected document", () => {
  for (const event of ["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED"]) {
    assert.equal(accountSessionChanged(event, "account-a", "account-b"), true);
  }
});

test("explicit sign-out invalidates old data without treating uncertain startup as account loss", () => {
  assert.equal(accountSessionChanged("SIGNED_OUT", "account-a", null), true);
  assert.equal(accountSessionChanged("INITIAL_SESSION", "account-a", null), false);
  assert.equal(accountSessionChanged("PASSWORD_RECOVERY", "account-a", null), false);
});
