import test from 'node:test';
import assert from 'node:assert/strict';
import { accountReferrals } from '../src/lib/admin-dashboard/referrals.ts';
import { accountParticipation } from '../src/lib/admin-dashboard/participation.ts';
import type { Sources } from '../src/lib/admin-dashboard/model.ts';
const src=(rows:Record<string,unknown>[]=[])=>({rows,error:null});
test('confirmed referrals handle multiple referrers, repeats, self edges, exclusions and absent identities',()=>{
 const s:Sources={profiles:src([{user_id:'u',referred_by_user_id:'b',acquisition_source:'friend_or_referral'},{user_id:'a',display_name:'A'},{user_id:'b',display_name:'B'}]),user_referrals:src([{referrer_user_id:'a',referee_user_id:'u',created_at:'2026-01-01'},{referrer_user_id:'b',referee_user_id:'u',created_at:'2026-02-01'},{referrer_user_id:'u',referee_user_id:'x'},{referrer_user_id:'u',referee_user_id:'x'},{referrer_user_id:'u',referee_user_id:'u'},{referrer_user_id:'u',referee_user_id:'test'}]),admin_analytics_exclusions:src([{user_id:'test'}])};
 const r=accountReferrals('u',s); assert.equal(r.unavailable,false);assert.deepEqual(r.referrers.map(p=>p.userId),['b','a']);assert.equal(r.referred.length,1);assert.equal(r.referred[0].person,undefined);
 assert.equal(accountReferrals('u',{profiles:s.profiles}).unavailable,true);
 assert.equal(accountReferrals('u',{profiles:s.profiles,user_referrals:src()}).referred.length,0);
 assert.equal(accountReferrals('u',{user_referrals:{rows:s.user_referrals.rows,error:'offline'}}).unavailable,true);
});
test('participation deduplicates approved registrations and castings while excluding cancelled and owned records',()=>{
 const s:Sources={activities:src([{id:'s',type:'session',status:'active'},{id:'c',type:'class',status:'active'},{id:'cancel',type:'session',status:'cancelled'}]),enrollments:src([{student_id:'u',activity_id:'s',status:'paid'},{student_id:'u',activity_id:'c',status:'refunded'}]),session_join_requests:src([{requester_id:'u',activity_id:'s',status:'approved'},{requester_id:'u',activity_id:'cancel',status:'approved'},{requester_id:'v',activity_id:'c',status:'approved'}]),activity_invites:src([{invited_user_id:'u',activity_id:'s',is_active:true,response_status:'accepted'}]),submissions:src([{talent_id:'u',roles:{casting_id:'cast'},status:'pending',submitted_at:'2026-01-01'},{talent_id:'u',roles:{casting_id:'cast'},status:'rejected',submitted_at:'2026-01-02'},{talent_id:'u',roles:{casting_id:'draft'},status:'draft',submitted_at:'2026-01-03'},{talent_id:'u',roles:{casting_id:'withdrawn'},status:'withdrawn',submitted_at:'2026-01-03'}]),projects:src([{id:'p',poster_id:'other'},{id:'own',poster_id:'u'}]),project_members:src([{user_id:'u',project_id:'p',role:'collaborator'},{user_id:'u',project_id:'own',role:'owner'}]),project_participants:src([{user_id:'u',project_id:'p'},{user_id:'u',project_id:'own'},{user_id:'u',project_id:'removed',removed_at:'2026-01-01'}]),bookings:src([{id:'b',talent_user_id:'u',status:'completed'},{id:'b',talent_user_id:'u',status:'completed'},{id:'paid',talent_user_id:'u',status:'confirmed'}])};
 const values=Object.fromEntries(accountParticipation('u',s).map(m=>[m.key,m.count]));assert.deepEqual(values,{sessions:1,castings:1,projects:1,classes:0,bookings:1});
 assert.equal(accountParticipation('u',{...s,projects:src([])}).find(m=>m.key==='projects')?.count,null);
 assert.equal(accountParticipation('u',{...s,activities:src([])})[0].count,null);
 s.submissions.rows.push({talent_id:'u',status:'pending',submitted_at:'2026-01-01',roles:{casting_id:null}});
 assert.equal(accountParticipation('u',s).find(m=>m.key==='castings')?.count,null);
 s.session_join_requests.error='offline';
 assert.equal(accountParticipation('u',s)[0].count,null);
 assert.ok(accountParticipation('u',{}).every(m=>m.count===null));
});
