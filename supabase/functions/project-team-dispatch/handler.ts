import { routeEmail } from "../_shared/email-routing.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
export function teamEmail(input: {email: string; token: string; title: string; role: string; job_title: string}, origin: string) {
 const url = new URL(`/team-invite/${encodeURIComponent(input.token)}`, origin);
 if (url.protocol !== "https:") throw new Error("HTTPS invitation URL required");
 return {from:"Motiion <notifications@motiion.io>",to:[input.email],subject:`You’re invited to ${input.title} on Motiion`,text:`Join ${input.title} as a project ${input.role}${input.job_title ? ` (${input.job_title})` : ""}.\n\n${input.role === "coordinator" ? "Coordinate the project schedule and logistics. This does not include casting decisions, contracts, rates, billing or team permissions." : "Manage this project’s casting and collaboration. Billing and team permissions stay with the owner."}\n\nThe project owner covers your access. You don’t need your own paid plan or industry application to join this project.\n\nAccept your invitation:\n${url}\n\nCreate an account or sign in using ${input.email}, verify your email, and choose Join project. This invitation expires in 30 days unless the owner revokes it sooner.`};
}
export function createTeamHandler(db: SupabaseClient, env: (key:string)=>string|undefined, send: typeof fetch) {
 return async(req: Request) => {
  if(!env("NOTIF_DISPATCH_SECRET") || req.headers.get("x-notif-dispatch-secret")!==env("NOTIF_DISPATCH_SECRET")) return new Response("Unauthorized",{status:401});
  if(req.method!=="POST") return new Response("Method not allowed",{status:405});
  const origin=env("INDUSTRY_APPROVAL_URL");
  if(!origin || !env("RESEND_API_KEY")) return new Response("Email configuration unavailable",{status:503});
  const config=await db.from("industry_approval_delivery_config").select("email_enabled").single();
  if(config.error || !config.data?.email_enabled) return new Response("Email delivery disabled",{status:503});
  const claimed=await db.rpc("claim_project_team_emails"); if(claimed.error) return new Response("Queue unavailable",{status:503});
  for(const row of claimed.data ?? []) {
   let result="retry"; let failure: string|null=null;
   try {
    const {data:inv,error}=await db.from("project_workspace_invitations").select("project_id,invited_by,email,token,role,job_title,enabled,accepted_by,expires_at").eq("id",row.invitation_id).single();
    if(error) throw error;
    const project=await db.from("projects").select("title,poster_id,is_active").eq("id",inv.project_id).single();
    if(project.error) throw project.error;
    if(!inv.enabled || inv.accepted_by || inv.token!==row.token || Date.parse(inv.expires_at)<=Date.now() || project.data.poster_id!==inv.invited_by || project.data.is_active===false || !["admin","coordinator"].includes(inv.role)) result="skipped";
    else {
     const response=await send("https://api.resend.com/emails",{method:"POST",signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env("RESEND_API_KEY")}`,"Content-Type":"application/json","Idempotency-Key":`project-team/${row.id}`},body:JSON.stringify(routeEmail(teamEmail({...inv,title:project.data.title},origin),env))});
     result=response.ok?"sent":[408,409,429].includes(response.status)||response.status>=500?"retry":"failed";
     if(result!=="sent") failure=`Provider HTTP ${response.status}`;
     await response.body?.cancel();
    }
   } catch {failure="Delivery interrupted; retry within provider idempotency window";}
   const ack=await db.rpc("finish_project_team_email",{p_id:row.id,p_lease:row.lease_id,p_result:result,p_error:failure});
   if(ack.error) return new Response("Queue acknowledgement failed",{status:503});
  }
  return Response.json({processed:claimed.data?.length ?? 0});
 };
}
