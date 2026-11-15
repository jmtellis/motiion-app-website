import { isStagingEmailProject, routeEmail, stagingAppOrigin } from "../_shared/email-routing.ts";
import { confirmationTemplate } from "./confirmation-template.ts";
type Env = (key: string) => string | undefined;
type Payload = { user: {email: string; new_email?: string}; email_data: {token: string; token_hash: string; token_new?: string; token_hash_new?: string; email_action_type: string; redirect_to?: string} };
const subjects: Record<string, string> = {signup:"Verify your Motiion email",invite:"Join Motiion",magiclink:"Sign in to Motiion",recovery:"Reset your Motiion password",email_change:"Confirm your email change",reauthentication:"Confirm your Motiion identity"};
export function authEmail(payload: Payload, env: Env) {
  if (!isStagingEmailProject(env)) throw new Error("This hook runs only in staging");
  const {user,email_data:data} = payload;
  if (!user?.email || !data || !subjects[data.email_action_type]) throw new Error("Unsupported auth email");
  const origin = stagingAppOrigin(env);
  let redirect = new URL("/auth/callback", origin);
  if (data.redirect_to) {
    const requested = new URL(data.redirect_to);
    if ([origin, "https://motiion-industry-staging.vercel.app"].includes(requested.origin) && requested.pathname === "/auth/callback") {
      redirect = new URL(requested.pathname + requested.search, origin);
    }
  }
  const sections: string[] = [];
  let confirmationURL = "";
  for (const [token,hash,label] of [[data.token,data.token_hash,user.email],[data.token_new,data.token_hash_new,user.new_email ?? "New email"]]) {
    if (!token && !hash) continue;
    if (token && !/^\d{6,10}$/.test(token)) throw new Error("Invalid verification code");
    sections.push(`${label}\n${token ? `Your verification code: ${token}\nEnter this code in the app or browser where you started.` : ""}`);
    if (hash) {
      const link = new URL("/auth/v1/verify", env("SUPABASE_URL"));
      link.searchParams.set("token",hash); link.searchParams.set("type",data.email_action_type); link.searchParams.set("redirect_to",redirect.toString());
      if (!confirmationURL) confirmationURL = link.toString();
      sections.push(`Or continue with this link:\n${link}`);
    }
  }
  if (!sections.length) throw new Error("Missing auth verification data");
  return routeEmail({from:"Motiion <notifications@motiion.io>",to:[user.email],subject:subjects[data.email_action_type],...(data.email_action_type === "signup" ? {html: confirmationTemplate.replaceAll("{{ .Token }}",data.token).replaceAll("{{ .ConfirmationURL }}",confirmationURL.replaceAll("&","&amp;").replaceAll('"',"&quot;"))} : {}),text:`${sections.join("\n\n")}\n\nCodes and links can only be used once. If expired, request a new one.`},env);
}
export function createAuthEmailHandler(env: Env, verify: (body: string, headers: Record<string,string>) => unknown, send: typeof fetch) {
  return async (req: Request) => {
    if (req.method !== "POST") return new Response("Method not allowed",{status:405});
    let payload: Payload;
    try { payload=verify(await req.text(),Object.fromEntries(req.headers)) as Payload; }
    catch { return new Response("Unauthorized",{status:401}); }
    try {
      const email=authEmail(payload,env);
      if (!env("RESEND_API_KEY")) throw new Error("Missing provider");
      const id=req.headers.get("webhook-id");
      if (!id || !/^[\w-]{1,200}$/.test(id)) return new Response("Invalid webhook ID",{status:400});
      const response=await send("https://api.resend.com/emails",{method:"POST",signal:AbortSignal.timeout(4000),headers:{Authorization:`Bearer ${env("RESEND_API_KEY")}`,"Content-Type":"application/json","Idempotency-Key":`staging-auth/${id}`},body:JSON.stringify(email)});
      const success=response.ok; await response.body?.cancel();
      if(!success) return Response.json({error:{http_code:503,message:"Staging email delivery unavailable"}},{status:503});
      return Response.json({});
    } catch { return Response.json({error:{http_code:503,message:"Staging email configuration or delivery unavailable"}},{status:503}); }
  };
}
