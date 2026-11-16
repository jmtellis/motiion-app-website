import {test} from "node:test";import assert from "node:assert/strict";
import {authEmail,createAuthEmailHandler} from "./handler.ts";
const settings:Record<string,string>={SUPABASE_URL:"https://mvkvztpvakybrhyupown.supabase.co",STAGING_EMAIL_RECIPIENT:"tester@example.com",STAGING_APP_URL:"http://localhost:3001",RESEND_API_KEY:"fixture"};
const payload={user:{email:"new-user@example.invalid"},email_data:{token:"123456",token_hash:"fixturehash",email_action_type:"signup",redirect_to:"http://localhost:3001/auth/callback?next=%2Fteam-invite%2Fws_test"}};
test("signup makes the code primary while routing only to tester",()=>{const mail=authEmail(payload,k=>settings[k]);assert.deepEqual(mail.to,["tester@example.com"]);assert.match(mail.text,/123456/);assert.match(mail.text,/new-user@example.invalid/);assert.match(mail.text,/continue creating your account/);assert(!mail.text.includes("/auth/v1/verify"));assert(!mail.html?.includes("<a "));});
test("hook cannot operate in production or redirect verification to production",()=>{assert.throws(()=>authEmail(payload,k=>k==="SUPABASE_URL"?"https://pygdxcscmebeqjxhzzuq.supabase.co":settings[k]));const mail=authEmail({...payload,email_data:{...payload.email_data,redirect_to:"https://motiion.app/auth/callback"}},k=>settings[k]);assert(!mail.text.includes("motiion.app"));});
test("unsigned requests do not send and provider failures return retryable error",async()=>{let sends=0;const send:typeof fetch=async()=>{sends++;return new Response(null,{status:429});};const request=()=>new Request('https://hook.invalid',{method:'POST',headers:{'webhook-id':'msg_test'},body:'{}'});const bad=createAuthEmailHandler(k=>settings[k],()=>{throw Error('bad signature');},send);assert.equal((await bad(request())).status,401);assert.equal(sends,0);const good=createAuthEmailHandler(k=>settings[k],()=>payload,send);assert.equal((await good(request())).status,503);assert.equal(sends,1);});
test("hook retries reuse provider idempotency key and acknowledge success",async()=>{const requests:RequestInit[]=[];const handler=createAuthEmailHandler(k=>settings[k],()=>payload,async(_url,init)=>{requests.push(init!);return Response.json({id:'email'});});for(let n=0;n<2;n++)assert.equal((await handler(new Request('https://hook.invalid',{method:'POST',headers:{'webhook-id':'msg_test'},body:'{}'}))).status,200);assert.deepEqual(requests[0].headers,requests[1].headers);});

test("confirmation template stays synchronized and code is an uninterrupted string", async()=> {
  const {readFileSync} = await import("node:fs");
  const {confirmationTemplate} = await import("./confirmation-template.ts");
  assert.equal(confirmationTemplate,readFileSync(new URL("../../templates/confirmation.html",import.meta.url),"utf8"));
  const mail=authEmail({...payload,email_data:{...payload.email_data,token:"00123456"}},k=>settings[k]);
  assert.match(mail.html!,/>00123456<\/p>/);
  assert.match(mail.text,/00123456/);
});
