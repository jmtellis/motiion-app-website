import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCastingVisibility, castingVisibilityLabel, isCastingPublicVisibility } from "../src/lib/talent-buyers/casting/casting-display";
import { castingConfigurationToComposerForm } from "../src/lib/talent-buyers/casting/casting-breakdown-sections";

test("opening and editing an unlisted casting preserves link-only visibility", () => {
  const visibility = normalizeCastingVisibility("unlisted");
  const form = castingConfigurationToComposerForm("project", { id: "casting", title: "Private-link casting", visibility });
  assert.equal(form.visibility, "unlisted");
  assert.equal(castingVisibilityLabel(visibility), "Unlisted");
  assert.equal(isCastingPublicVisibility(visibility), false);
});

test("legacy invite-only and unknown visibility never default an edit to public", () => {
  for (const value of ["invite_only", "invitation_only", "unknown", null]) {
    const visibility = normalizeCastingVisibility(value);
    assert.equal(isCastingPublicVisibility(visibility), false);
    assert.equal(castingConfigurationToComposerForm("project", { id: "casting", title: "Private", visibility }).visibility, "private");
  }
});
