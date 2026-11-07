import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { billedArtistsEyebrow } from "../src/lib/app/event-artists";

describe("billedArtistsEyebrow", () => {
  it("joins project artists in order", () => {
    assert.equal(
      billedArtistsEyebrow({
        project_artists: [{ id: "1", name: "Sabrina Carpenter" }, { id: "2", name: "Doja Cat" }],
      }),
      "Sabrina Carpenter, Doja Cat",
    );
  });

  it("falls back to tour artists when project artists are absent", () => {
    assert.equal(
      billedArtistsEyebrow({
        kind: "tour",
        artists: [{ id: "1", name: "Beyoncé" }],
      }),
      "Beyoncé",
    );
  });

  it("returns null when no billed artists are set", () => {
    assert.equal(billedArtistsEyebrow({}), null);
    assert.equal(billedArtistsEyebrow(null), null);
    assert.equal(billedArtistsEyebrow({ project_artists: [{ id: "1", name: "  " }] }), null);
  });
});
