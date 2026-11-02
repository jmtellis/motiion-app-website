import assert from "node:assert/strict";
import test from "node:test";
import { getProfileAvatarUrl } from "../src/lib/auth/avatar";

test("partial or malformed historical media renders a fallback instead of breaking the account", () => {
  for (const value of [null, undefined, "not-an-array", {}, [null, 4, {}, " "]]) {
    assert.equal(getProfileAvatarUrl(value), null);
  }
  assert.equal(getProfileAvatarUrl([null, " ", " https://example.com/avatar.jpg ", 4]), "https://example.com/avatar.jpg");
});
