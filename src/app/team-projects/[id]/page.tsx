import { requireAuth } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ProjectTeamWorkspace } from "@/components/projects/ProjectTeamWorkspace";
import type { TeamWorkspace } from "@/lib/talent-buyers/project-team";
export default async function Page({params}:{params:Promise<{id:string}>}) {
 await requireAuth(); const {id}=await params;
 const db=await createServerSupabaseClient(); if(!db) throw new Error("Unable to connect");
 const {data,error}=await db.rpc("get_project_team_workspace",{p_project_id:id});
 if(error || !data) notFound();
 return <ProjectTeamWorkspace workspace={data as TeamWorkspace}/>;
}
