import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildProfessionalProfilesQueryPath } from "../src/lib/search/search-profiles";
import {
  filterSearchProfiles,
  isTalentSearchProfile,
} from "../src/lib/search/talent-filter-logic";
import type { SearchProfileRecord } from "../src/types/search";

function profile(partial: Partial<SearchProfileRecord> & { id: string }): SearchProfileRecord {
  return {
    username: partial.username ?? partial.id,
    full_name: partial.full_name ?? "Test User",
    display_name: partial.display_name ?? "Test User",
    headshot_url: null,
    headshot_urls: null,
    location: null,
    styles: [],
    skills: [],
    talent_types: [],
    gender: null,
    ethnicity: null,
    union_status: null,
    is_verified: true,
    representation: null,
    ...partial,
  };
}

describe("talent-only professional profile queries", () => {
  it("queries the talent_professional_profiles view with dancer/choreographer subtypes", () => {
    const path = buildProfessionalProfilesQueryPath({ navigator: true }, null);
    assert.match(path, /^talent_professional_profiles\?/);
    assert.match(path, /subtype=in\.\("dancer","choreographer"\)/);
    assert.match(path, /is_verified=eq\.true/);
  });
});

describe("talent search defensive filtering", () => {
  it("keeps dancer and choreographer profiles", () => {
    const dancer = profile({ id: "d1", talent_types: ["dancer"] });
    const choreo = profile({ id: "c1", talent_types: ["choreographer"] });
    assert.equal(isTalentSearchProfile(dancer), true);
    assert.equal(isTalentSearchProfile(choreo), true);

    const filtered = filterSearchProfiles([dancer, choreo], { navigator: true });
    assert.equal(filtered.length, 2);
  });

  it("excludes industry-style non-talent type labels", () => {
    const industry = profile({
      id: "i1",
      talent_types: ["casting_director"],
      full_name: "Industry Pro",
    });
    assert.equal(isTalentSearchProfile(industry), false);

    const filtered = filterSearchProfiles([industry], { navigator: true });
    assert.equal(filtered.length, 0);
  });
});
