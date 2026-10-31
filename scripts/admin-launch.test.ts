import test from "node:test";
import assert from "node:assert/strict";
import {
  excludeAccounts,
  readiness,
  metricValues,
  projectActive,
  activityActive,
  castingOpen,
  progress,
  currencyTotals,
  uniqueUsers,
  type Sources,
} from "../src/lib/admin-dashboard/model.ts";
const now = new Date("2026-10-31T15:00:00Z");
test("unknown is not zero and absent targets are not invented", () => {
  assert.equal(metricValues({}, now).ready_talent, null);
  assert.equal(
    metricValues({ profiles: { rows: [], error: "offline" } }, now)
      .ready_talent,
    null,
  );
  assert.equal(
    metricValues({ profiles: { rows: [], error: null } }, now).ready_talent,
    0,
  );
  assert.equal(progress(null, 100), null);
  assert.equal(progress(0, 0, true), 100);
});
test("readiness is independent of approval and identity", () => {
  assert.equal(
    readiness({
      profile_review_status: "approved",
      identity_verification_status: "verified",
    }).ready,
    false,
  );
  assert.equal(
    readiness({
      onboarding_completed_at: "date",
      headshot_urls: ["a"],
      profile_visuals: [{}],
      experiences: [{}],
      styles: ["jazz"],
    }).ready,
    true,
  );
});
test("lifecycle boundaries exclude drafts and expired records", () => {
  assert.equal(
    projectActive({ is_active: true, end_date: "2026-10-30" }, now),
    false,
  );
  assert.equal(
    projectActive(
      { is_active: true, project_configuration: { composer_draft: true } },
      now,
    ),
    false,
  );
  assert.equal(
    projectActive({ is_active: true, end_date: "2026-10-31" }, now),
    true,
  );
  assert.equal(
    activityActive({ status: "active", activity_date: "2026-10-30" }, now),
    false,
  );
  assert.equal(
    activityActive({ status: "cancelled", activity_date: "2026-11-01" }, now),
    false,
  );
  assert.equal(
    castingOpen(
      { status: "open", submission_deadline: "2026-10-31T14:59:59Z" },
      now,
    ),
    false,
  );
});
test("explicit exclusions propagate to owned and financial records without name heuristics", () => {
  const s: Sources = {
    admin_analytics_exclusions: { rows: [{ user_id: "test" }], error: null },
    profiles: {
      rows: [
        { user_id: "test" },
        { user_id: "real", email: "test@example.com" },
      ],
      error: null,
    },
    projects: { rows: [{ id: "p", poster_id: "test" }], error: null },
    castings: { rows: [{ project_id: "p" }], error: null },
    professional_profiles: { rows: [{ id: "professional-test", user_id: "test" }], error: null },
    talent_list_members: { rows: [{ profile_id: "professional-test" }], error: null },
    identity_verification_fee_payments: {
      rows: [{ profile_id: "test", amount_cents: 500 }],
      error: null,
    },
  };
  const result = excludeAccounts(s);
  assert.equal(result.profiles.rows.length, 1);
  assert.equal(result.castings.rows.length, 0);
  assert.equal(result.talent_list_members.rows.length, 0);
  assert.equal(result.identity_verification_fee_payments.rows.length, 0);
  assert.equal(s.profiles.rows.length, 2);
});
test("financial sums keep currencies separate and withhold incomplete amounts", () => {
  assert.deepEqual(
    currencyTotals(
      [
        { amount: 100, currency: "usd" },
        { amount: 200, currency: "eur" },
      ],
      "amount",
    ),
    { USD: 100, EUR: 200 },
  );
  assert.equal(
    currencyTotals([{ amount: null, currency: "usd" }], "amount"),
    null,
  );
  assert.equal(currencyTotals([{ amount: 100 }], "amount"), null);
});
test("active users deduplicate retries and omit anonymous events", () => {
  assert.equal(
    uniqueUsers([
      { user_id: "a" },
      { user_id: "a" },
      { user_id: null },
      { user_id: "b" },
    ]),
    2,
  );
});
test("pending review creation timestamps do not masquerade as completed turnaround", () => {
  const sources: Sources = {
    profile_review_requests: {
      rows: [
        {
          status: "pending",
          submitted_at: "2026-10-01",
          created_at: "2026-10-02",
        },
      ],
      error: null,
    },
    industry_application_reviews: { rows: [], error: null },
  };
  assert.equal(metricValues(sources, now).review_days, null);
});

import { buildTrend } from '../src/lib/admin-dashboard/trends.ts';
test('trend boundaries align prior periods and exclude missing dates and future records', () => {
  const s = {profiles:{error:null,rows:[{created_at:'2026-10-01T15:00:00Z'},{created_at:'2026-10-31T15:00:00Z'},{created_at:'2026-09-01T15:00:00Z'},{created_at:'invalid'}]}};
  const t=buildTrend(s,'profiles',30,now.toISOString());
  assert.equal(t.current,1); assert.equal(t.previous,1);
  assert.equal(t.points[0].current,1); assert.equal(t.points[0].previous,1);
  assert.equal(t.missingDates,1);
});
test('daily active users deduplicate each interval and whole comparison periods independently', () => {
  const event=(date:string,user='a') => ({created_at:date,user_id:user});
  const t=buildTrend({analytics_events:{error:null,rows:[event('2026-10-30T16:00:00Z'),event('2026-10-30T17:00:00Z'),event('2026-10-29T16:00:00Z'),event('2026-10-30T16:00:00Z','')]}},'activity',7,now.toISOString());
  assert.equal(t.current,1); assert.equal(t.points.reduce((n,p)=>n+p.current,0),2);
});
test('trends distinguish unavailable, empty history and observed zero; opportunity history ignores current status', () => {
  assert.equal(buildTrend({},'projects',7,now.toISOString()).unavailable,true);
  assert.equal(buildTrend({projects:{rows:[],error:null}},'projects',7,now.toISOString()).hasHistory,false);
  const t=buildTrend({activities:{error:null,rows:[{type:'class',status:'ended',created_at:'2026-10-30T16:00:00Z'},{type:'event',created_at:'2026-10-30T16:00:00Z'}]},castings:{error:null,rows:[{status:'closed',created_at:'2026-10-30T16:00:00Z'}]}},'opportunities',7,now.toISOString());
  assert.equal(t.current,2); assert.equal(t.points[0].current,0); assert.equal(t.hasHistory,true);
});

import {sortDirectory,directoryState} from '../src/lib/admin-dashboard/directory.ts';
test('directory sorts default newest, oldest, and name with missing dates last and stable ties',()=>{
  const records=[{user_id:'old',display_name:'Zoe',created_at:'2026-01-01'},{user_id:'new',display_name:'Amir',created_at:'2026-10-30'},{user_id:'missing',display_name:'Ada'}];
  assert.deepEqual(sortDirectory(records).map(p=>p.user_id),['new','old','missing']);
  assert.deepEqual(sortDirectory(records,'oldest').map(p=>p.user_id),['old','new','missing']);
  assert.deepEqual(sortDirectory(records,'name').map(p=>p.user_id),['missing','new','old']);
  assert.equal(records[0].user_id,'old');
  assert.deepEqual(directoryState({query:'a',status:'pending',sort:'oldest',page:'2'}),{query:'a',status:'pending',sort:'oldest',page:'2'});
  assert.equal(directoryState({sort:'unsupported'}).sort,'newest');
});
