import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateIndustryApplication, industryApplicationCopy, type IndustryApplicationDetails } from "../src/lib/talent-buyers/industry-application";
const valid: IndustryApplicationDetails = { full_name: "Alex", professional_role: "Producer", organization: "Independent", contact_email: "alex@gmail.com", work_url: "https://example.com/credits", hiring_projects: "Music videos and live performances" };
describe("industry applications", () => {
  it("accepts an independent professional with personal email", () => assert.equal(validateIndustryApplication(valid), null));
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
    assert.match(industryApplicationCopy.pending.body, /correct/);
    assert.match(industryApplicationCopy.needs_information.body, /another review/);
    assert.match(industryApplicationCopy.rejected.body, /same application/);
    assert.match(industryApplicationCopy.approved.title, /approved/);
  });
});
