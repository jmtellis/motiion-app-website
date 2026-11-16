import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateIndustryApplication, industryApplicationCopy, type IndustryApplicationDetails } from "../src/lib/talent-buyers/industry-application";
const valid: IndustryApplicationDetails = { full_name: "Alex", professional_role: "Producer", organization: "Independent", contact_email: "alex@gmail.com", work_url: "https://example.com/credits", hiring_projects: "Music videos and live performances" };
describe("industry applications", () => {
  it("accepts an independent professional with personal email", () => assert.equal(validateIndustryApplication(valid), null));
  it("accepts multiple roles and custom roles in the existing text field", () => {
    assert.equal(validateIndustryApplication({ ...valid, professional_role: "Producer; Creative Director; Movement consultant" }), null);
  });
  it("requires identity and project context", () => {
    for (const field of Object.keys(valid).filter(key => key !== "work_url") as (keyof IndustryApplicationDetails)[]) assert.ok(validateIndustryApplication({ ...valid, [field]: "" }), field);
  });
  it("accepts an omitted work link", () => {
    for (const work_url of ["", "   "]) assert.equal(validateIndustryApplication({ ...valid, work_url }), null);
  });
  it("rejects script links and links containing credentials", () => {
    for (const work_url of ["javascript:alert(1)", "file:///etc/passwd", "https://user:password@example.com/", "not a url"]) assert.ok(validateIndustryApplication({ ...valid, work_url }));
  });
  it("bounds applicant-controlled fields", () => {
    assert.ok(validateIndustryApplication({ ...valid, hiring_projects: "x".repeat(3001) }));
    assert.ok(validateIndustryApplication({ ...valid, professional_role: "x".repeat(201) }));
  });
  it("distinguishes review from approval, with correction and resubmission", () => {
    assert.match(industryApplicationCopy.pending.body, /email you/);
    assert.match(industryApplicationCopy.needs_information.body, /another review/);
    assert.match(industryApplicationCopy.rejected.body, /same application/);
    assert.match(industryApplicationCopy.approved.title, /approved/);
  });
});

import { parseIndustryProjects, serializeIndustryProjects } from "../src/lib/talent-buyers/industry-application";
describe("project selection compatibility", () => {
  it("round trips app selections and custom details", () => {
    const selection = { selected: ["Tours", "Music videos"], includesOther: true, other: "Museum residencies" };
    assert.deepEqual(parseIndustryProjects(serializeIndustryProjects(selection)), selection);
  });
  it("preserves existing free text and recognizes old website chips", () => {
    assert.equal(parseIndustryProjects("A festival with local artists").other, "A festival with local artists");
    assert.deepEqual(parseIndustryProjects("Tours; Music videos").selected, ["Tours", "Music videos"]);
    assert.deepEqual(parseIndustryProjects("Projects: Tour; Print / Commercial").selected, ["Tours", "Print campaigns", "Commercials & video ads"]);
  });
  it("allows one short project choice but requires Other details", () => {
    assert.equal(validateIndustryApplication({ ...valid, hiring_projects: "Projects: Tours" }), null);
    assert.ok(validateIndustryApplication({ ...valid, hiring_projects: "Projects: Tours\nOther: " }));
    assert.equal(serializeIndustryProjects({ selected: [], includesOther: false, other: "" }), "");
  });
});
