"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
export async function teamAction(projectId:string, action:"invite"|"revoke"|"member"|"schedule", data:Record<string,string>) {
 const db=await createServerSupabaseClient(); if(!db) return {error:"Could not connect. Please try again."};
 const calls = {
 invite: {name:"send_project_team_invitation",params:{p_project_id:projectId,p_email:data.email,p_role:data.role,p_job_title:data.job_title??""}},
 revoke: {name:"revoke_project_team_invitation",params:{p_invitation_id:data.invitation_id}},
 member: {name:"manage_project_team_member",params:{p_project_id:projectId,p_user_id:data.user_id,p_role:data.role,p_job_title:data.job_title??""}},
 schedule: data.category_id ? {name:"update_project_team_occurrence",params:{p_project_id:projectId,p_category_id:data.category_id,p_day:data.original_day,p_date:data.date||null,p_start:data.start_time||null,p_end:data.end_time||null,p_location:data.location??""}} : {name:"update_project_team_schedule",params:{p_project_id:projectId,p_activity_id:data.activity_id,p_date:data.date||null,p_start:data.start_time||null,p_end:data.end_time||null,p_location:data.location??""}},
 };
 const call=calls[action]; if(!call) return {error:"Invalid action."};
 const {error}=await db.rpc(call.name,call.params);
 if(error) return {error:error.message};
 revalidatePath(`/team-projects/${projectId}`); return {ok:true};
}
