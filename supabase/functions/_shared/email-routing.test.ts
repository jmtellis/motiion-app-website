import {test} from "node:test";
import assert from "node:assert/strict";
import {routeEmail} from "./email-routing.ts";
const message={from:"Motiion <notifications@motiion.io>",to:["someone@example.invalid"],subject:"Invite",text:"https://motiion-industry-staging.vercel.app/team-invite/test",html:"<p>Join</p>"};
const settings:Record<string,string>={SUPABASE_URL:"https://mvkvztpvakybrhyupown.supabase.co",STAGING_EMAIL_RECIPIENT:"tester@example.com",STAGING_APP_URL:"http://localhost:3001"};
test("every staging message goes exclusively to the configured inbox, retaining intended identity",()=>{
  const routed=routeEmail(message,k=>settings[k]);assert.deepEqual(routed.to,["tester@example.com"]);assert.match(routed.subject,/^\[STAGING\]/);assert.match(routed.text,/someone@example.invalid/);assert.match(routed.text,/http:\/\/localhost:3001\/team-invite\/test/);
});
test("staging fails closed for absent/multiple recipients, unknown projects and production links",()=>{
 for(const patch of [{STAGING_EMAIL_RECIPIENT:""},{STAGING_EMAIL_RECIPIENT:"a@example.com,b@example.com"},{STAGING_EMAIL_RECIPIENT:"a@example.com\nBcc:b@example.com"},{SUPABASE_URL:"https://unknown.supabase.co"},{STAGING_APP_URL:"https://motiion.app"},{STAGING_APP_URL:"http://localhost:3001@evil.example"}]) assert.throws(()=>routeEmail(message,k=>({...settings,...patch})[k]));
});
test("production preserves recipients and content even if staging recipient is set",()=>{
 assert.equal(routeEmail(message,k=>k==="SUPABASE_URL"?"https://pygdxcscmebeqjxhzzuq.supabase.co":settings[k]),message);
});
test("intended address is escaped in staging HTML",()=>{
 assert(!routeEmail({...message,to:["<script>bad</script>"]},k=>settings[k]).html?.includes("<script>"));
});
