import assert from "node:assert/strict";
import test from "node:test";
import { extendsRosterAccess, rosterShareExpiry, rosterShareIsActive } from "../src/lib/talent-buyers/roster-access-model";
test("access durations use elapsed time across daylight saving boundaries", () => {
  const now = new Date("2026-11-01T08:30:00.000Z");
  assert.equal(rosterShareExpiry("oneDay", now), "2026-11-02T08:30:00.000Z");
  assert.equal(rosterShareExpiry("oneWeek", now), "2026-11-08T08:30:00.000Z");
  assert.equal(rosterShareExpiry("thirtyDays", now), "2026-12-01T08:30:00.000Z");
  assert.equal(rosterShareExpiry("indefinite", now), null);
});
test("free owners may reduce indefinite access but extending expiry requires entitlement", () => {
  assert.equal(extendsRosterAccess(null,"2026-11-05T00:00:00Z"),false);
  assert.equal(extendsRosterAccess("2026-11-05T00:00:00Z",null),true);
  assert.equal(extendsRosterAccess("2026-11-05T00:00:00Z","2026-11-06T00:00:00Z"),true);
  assert.equal(extendsRosterAccess("2026-11-05T00:00:00Z","2026-11-04T00:00:00Z"),false);
  assert.equal(extendsRosterAccess("2026-11-05T00:00:00Z","2026-11-05T00:00:00Z"),false);
});
test("expiry boundary matches database greater-than policy and malformed expiry fails closed", () => {
  const now=new Date("2026-11-05T00:00:00Z");
  assert.equal(rosterShareIsActive(null,now),true);
  assert.equal(rosterShareIsActive("2026-11-05T00:00:00Z",now),false);
  assert.equal(rosterShareIsActive("2026-11-05T00:00:00.001Z",now),true);
  assert.equal(rosterShareIsActive("invalid",now),false);
  assert.throws(()=>rosterShareExpiry("oneDay",new Date("invalid")));
});
