import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedProfessionals, businessKpis } from '../src/lib/admin-dashboard/business-kpis.ts';
import { recordedMoney } from '../src/lib/admin-dashboard/finance.ts';
import { excludeAccounts, inPeriod, type Sources } from '../src/lib/admin-dashboard/model.ts';

test('verified professionals require coverage, deduplicate identities and honor exclusions',()=>{
  assert.equal(verifiedProfessionals({}),null);
  const s: Sources = {profiles:{rows:[{user_id:'a',account_type:'talent'},{user_id:'b',account_type:'industry'},{user_id:'c',account_type:'talent'}],error:null},professional_profiles:{rows:[{id:'pa',user_id:'a',is_verified:true},{id:'pa',user_id:'a',is_verified:true},{id:'pb',user_id:'b',is_verified:true},{id:'pc',user_id:'c',is_verified:true}],error:null},admin_analytics_exclusions:{rows:[{user_id:'c'}],error:null}};
  assert.equal(verifiedProfessionals(excludeAccounts(s)),1);
  s.professional_profiles.rows.push({user_id:'unknown'});
  assert.equal(verifiedProfessionals(s),null);
  s.professional_profiles={rows:[],error:'offline'};
  assert.equal(verifiedProfessionals(s),null);
  s.professional_profiles={rows:[],error:null};
  assert.equal(verifiedProfessionals(s),0);
});
test('financial summary separates currencies, respects dates and never fills missing amounts with zero',()=>{
  const period=(r: Record<string,unknown>)=>inPeriod(r,'2026-10-01T00:00:00Z','2026-11-01T00:00:00Z','paid_at');
  const s: Sources={payments:{rows:[{paid_at:'2026-10-01T00:00:00Z',amount:12345,currency:'usd'},{paid_at:'2026-10-20T00:00:00Z',amount:500,currency:'eur'},{paid_at:'2026-11-01T00:00:00Z',amount:999,currency:'usd'}],error:null}};
  assert.equal(recordedMoney(s,'payments','amount',period),'USD 123.45 · EUR 5.00');
  assert.equal(recordedMoney({},'payments','amount',period),'Unavailable');
  assert.equal(recordedMoney(s,'payments','fee',period),'Amount or currency coverage incomplete');
  s.payments={rows:[],error:'offline'};
  assert.equal(recordedMoney(s,'payments','amount',period),'Unavailable');
  s.payments.error=null;
  assert.equal(recordedMoney(s,'payments','amount',period),'No recorded charges');
});
test('phase targets preserve explicit timing uncertainty and later stretch status',()=>{
  assert.match(businessKpis.find(k=>k.key==='event_profiles')!.period,/calendar deadline unconfirmed/);
  assert.match(businessKpis.find(k=>k.key==='pro')!.phase,/Later/);
  assert.match(businessKpis.find(k=>k.key==='pro')!.target,/stretch/);
  assert.match(businessKpis.find(k=>k.key==='qr')!.target,/Set after/);
});
