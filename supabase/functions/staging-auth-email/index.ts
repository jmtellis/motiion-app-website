import { Webhook } from "npm:standardwebhooks@1.0.0";
import { createAuthEmailHandler } from "./handler.ts";
Deno.serve(createAuthEmailHandler(key=>Deno.env.get(key),(body,headers)=>{
  const secret=Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if(!secret) throw new Error("Missing signing secret");
  return new Webhook(secret.replace(/^v1,whsec_/,"")).verify(body,headers);
},fetch));
