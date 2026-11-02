import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isIosUserAgent,
  MOTIION_CUSTOM_SCHEME,
  profileAppSchemeUrl,
  profileFallbackUrl,
  profileWebPath,
  profileWebUrl,
  talentProfileSlug,
} from "../src/lib/app-links/motiion-profile.ts";

describe("motiion profile deep links", () => {
  it("prefers username, then user id, and skips empty placeholder rows", () => {
    assert.equal(talentProfileSlug({ username: "alexandra", userId: "uuid" }), "alexandra");
    assert.equal(talentProfileSlug({ username: "  ", userId: " uuid " }), "uuid");
    assert.equal(talentProfileSlug({ username: null, userId: "" }), null);
  });

  it("builds the web profile path and the custom-scheme URL for DeepLinkRouter", () => {
    assert.equal(profileWebPath("alexandra"), "/profile/alexandra");
    assert.equal(profileWebPath("a b"), "/profile/a%20b");
    assert.equal(profileWebUrl("alexandra", "https://www.motiion.app/"), "https://www.motiion.app/profile/alexandra");
    assert.equal(
      profileAppSchemeUrl("alexandra"),
      `${MOTIION_CUSTOM_SCHEME}://www.motiion.app/profile/alexandra`,
    );
    assert.equal(profileAppSchemeUrl("a/b"), `${MOTIION_CUSTOM_SCHEME}://www.motiion.app/profile/a%2Fb`);
  });

  it("detects iOS and falls back to the App Store there, web profile elsewhere", () => {
    assert.equal(isIosUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), true);
    assert.equal(isIosUserAgent("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)"), true);
    assert.equal(
      isIosUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)"),
      false,
    );
    assert.equal(
      isIosUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      ),
      true,
    );
    assert.equal(isIosUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), false);

    const store = "https://apps.apple.com/app/id6759847766";
    assert.equal(
      profileFallbackUrl("alexandra", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", store),
      store,
    );
    assert.equal(
      profileFallbackUrl("alexandra", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", store),
      "https://www.motiion.app/profile/alexandra",
    );
  });
});
