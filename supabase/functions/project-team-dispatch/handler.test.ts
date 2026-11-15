import {test} from 'node:test';import assert from 'node:assert/strict';import {createTeamHandler,teamEmail} from './handler.ts';
function fixture({enabled=true,status=200,role='admin',token='ws_fixture',confirmed=false}={}) {
 const sent:RequestInit[]=[];const ack:any[]=[];
 const row={id:'delivery',invitation_id:'invite',token:'ws_fixture',lease_id:'lease'};
 const inv={project_id:'project',invited_by:'owner',email:'teammate@example.invalid',token,role,job_title:'Assistant',enabled,accepted_by:confirmed?'user':null,expires_at:'2099-01-01'};
 const db:any={from:(name:string)=>{const q:any={select:()=>q,eq:()=>q,single:async()=>({data:name==='industry_approval_delivery_config'?{email_enabled:true}:name==='projects'?{title:'Project',poster_id:'owner',is_active:true}:inv})};return q;},rpc:async(name:string,args:unknown)=>name==='claim_project_team_emails'?{data:[row]}:(ack.push(args),{})};
 const handler=createTeamHandler(db,k=>k==='NOTIF_DISPATCH_SECRET'?'secret':k==='INDUSTRY_APPROVAL_URL'?'https://example.invalid/industry/approved':'fake',async(_url,init)=>{sent.push(init!);return new Response(null,{status});});
 return {sent,ack,run:(secret='secret')=>handler(new Request('https://worker.invalid',{method:'POST',headers:{'x-notif-dispatch-secret':secret}}))};
}
test('dispatch rejects unauthenticated calls',async()=>{const f=fixture();assert.equal((await f.run('bad')).status,401);assert.equal(f.sent.length,0);});
test('revoked, rotated, accepted and participant invitations never send',async()=>{for(const options of [{enabled:false},{token:'rotated'},{confirmed:true},{role:'participant'}]){const f=fixture(options);await f.run();assert.equal(f.sent.length,0);assert.equal(f.ack[0].p_result,'skipped');}});
test('retry retains email idempotency and sensitive detail is not logged',async()=>{const f=fixture({status:429});await f.run();await f.run();assert.equal(f.ack[0].p_result,'retry');assert.deepEqual(f.sent[0].headers,f.sent[1].headers);});
test('success and permanent failure acknowledged correctly',async()=>{for(const status of [200,400]){const f=fixture({status});await f.run();assert.equal(f.ack[0].p_result,status===200?'sent':'failed');}});
test('coordinator email explains scoped access and verified account',()=>{const e=teamEmail({email:'x@example.invalid',token:'ws_test',title:'Project',role:'coordinator',job_title:'Assistant'},'https://example.invalid/industry/approved');assert.match(e.text,/https:\/\/example.invalid\/team-invite\/ws_test/);assert.match(e.text,/does not include casting decisions/);assert.match(e.text,/verify your email/);assert.throws(()=>teamEmail({email:'x',token:'x',title:'x',role:'admin',job_title:''},'http://example.invalid'));});
