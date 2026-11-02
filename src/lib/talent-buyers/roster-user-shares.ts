"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readPagedRows } from "@/lib/supabase/read-pages";
import { requireIndustryApproval } from "@/lib/talent-buyers/require-industry-approval";
import { userHasPaidEntitlement } from "@/lib/billing/entitlement";
import { extendsRosterAccess, rosterShareExpiry, type RosterShareDuration } from "./roster-access-model";

export type RosterUserAccess = { id: string; recipientId: string; name: string; expiresAt: string | null };
export type SharedRosterSummary = { id: string; name: string; description: string | null; ownerName: string; expiresAt: string | null };
export type SharedRosterMember = { id: string; profileId: string; userId: string | null; name: string; slug: string | null; location: string | null; avatarUrl: string | null; styles: string[]; notes: string | null; unavailable: boolean };
export type SharedRoster = SharedRosterSummary & { members: SharedRosterMember[] };
const idSchema = z.string().uuid();
const durationSchema = z.enum(["oneDay", "oneWeek", "thirtyDays", "indefinite"]);
function name(row: { display_name?: string | null; first_name?: string | null; last_name?: string | null; username?: string | null } | undefined) {
  return row?.display_name?.trim() || [row?.first_name,row?.last_name].filter(Boolean).join(" ") || row?.username || "Motiion member";
}
async function ownerContext(listId: string) {
  const db = await createServerSupabaseClient();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!db || !user || !idSchema.safeParse(listId).success) return null;
  const { data, error } = await db.from("talent_lists").select("id,name").eq("id",listId).eq("owner_id",user.id).eq("kind","roster").maybeSingle();
  return !error && data ? { db,user,list:data } : null;
}
function refreshRoster(listId: string) { revalidatePath(`/library/${listId}`); revalidatePath("/library"); revalidatePath("/shared/rosters"); revalidatePath(`/shared/roster/${listId}`); revalidatePath("/discover"); }
export async function loadRosterUserAccess(listId: string): Promise<{ shares: RosterUserAccess[]; canShare: boolean; error: string | null }> {
  const context = await ownerContext(listId);
  if (!context) return { shares: [], canShare:false, error:"This roster is unavailable or you do not own it." };
  const {db,user}=context;
  const [result, canShare] = await Promise.all([
    readPagedRows((from,to)=>db.from("talent_list_user_shares").select("id,recipient_user_id,expires_at").eq("list_id",listId).eq("owner_user_id",user.id).order("created_at",{ascending:false}).order("id").range(from,to)),
    userHasPaidEntitlement(user.id,"industry_pro"),
  ]);
  if (result.error) return { shares:[],canShare,error:"Could not load roster access. Please retry." };
  const ids = (result.data??[]).map(row=>row.recipient_user_id);
  const profiles=ids.length?await db.from("profiles").select("user_id,display_name,first_name,last_name,username").in("user_id",ids):{data:[]};
  return { canShare,error:null,shares:(result.data??[]).map(row=>({id:row.id,recipientId:row.recipient_user_id,name:name(profiles.data?.find(p=>p.user_id===row.recipient_user_id)),expiresAt:row.expires_at})) };
}
export async function shareRosterWithUser(listId: string, recipientId: string, duration: RosterShareDuration) {
  const context=await ownerContext(listId);
  if (!context || !idSchema.safeParse(recipientId).success || !durationSchema.safeParse(duration).success || recipientId===context.user.id) return {ok:false,error:"Choose a different member and a valid access duration."};
  const approval=await requireIndustryApproval(context.user.id);
  if(!approval.ok) return {ok:false,error:approval.error};
  if(!await userHasPaidEntitlement(context.user.id,"industry_pro")) return {ok:false,error:"Industry Pro is required to share a roster. Existing access can still be shortened or removed."};
  const result=await context.db.from("talent_list_user_shares").upsert({list_id:listId,owner_user_id:context.user.id,recipient_user_id:recipientId,expires_at:rosterShareExpiry(duration)},{onConflict:"list_id,recipient_user_id"}).select("id").single();
  if(result.error||!result.data)return {ok:false,error:"Could not share this roster. Please retry."};
  refreshRoster(listId);return {ok:true,error:null};
}
export async function updateRosterUserAccess(listId:string,shareId:string,duration:RosterShareDuration){
  const context=await ownerContext(listId);
  if(!context||!idSchema.safeParse(shareId).success||!durationSchema.safeParse(duration).success)return {ok:false,error:"This access could not be updated."};
  const previous=await context.db.from("talent_list_user_shares").select("expires_at").eq("id",shareId).eq("list_id",listId).eq("owner_user_id",context.user.id).maybeSingle();
  if(previous.error||!previous.data)return {ok:false,error:"This access no longer exists. Refresh and retry."};
  const expiresAt=rosterShareExpiry(duration);
  if(extendsRosterAccess(previous.data.expires_at,expiresAt)) {
    const approval = await requireIndustryApproval(context.user.id);
    if (!approval.ok) return { ok:false, error:approval.error };
    if(!await userHasPaidEntitlement(context.user.id,"industry_pro"))return {ok:false,error:"Industry Pro is required to extend access. You can still shorten or remove it."};
  }
  const result=await context.db.from("talent_list_user_shares").update({expires_at:expiresAt}).eq("id",shareId).eq("owner_user_id",context.user.id).select("id").maybeSingle();
  if(result.error||!result.data)return {ok:false,error:"Could not update this access. Please retry."};
  refreshRoster(listId);return {ok:true,error:null};
}
export async function revokeRosterUserAccess(listId:string,shareId:string){
  const context=await ownerContext(listId);
  if(!context||!idSchema.safeParse(shareId).success)return {ok:false,error:"This access could not be removed."};
  const result=await context.db.from("talent_list_user_shares").delete().eq("id",shareId).eq("list_id",listId).eq("owner_user_id",context.user.id).select("id");
  if(result.error)return {ok:false,error:"Could not remove access. Please retry."};
  refreshRoster(listId);return {ok:true,error:null};
}
export async function listRostersSharedWithMe():Promise<{rosters:SharedRosterSummary[];error:string|null}>{
  const db=await createServerSupabaseClient();const user=db?(await db.auth.getUser()).data.user:null;
  if(!db||!user)return {rosters:[],error:"Sign in to view shared rosters."};
  const result=await readPagedRows((from,to)=>db.from("talent_list_user_shares").select("list_id,owner_user_id,expires_at,list:talent_lists(id,name,description)").eq("recipient_user_id",user.id).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order("updated_at",{ascending:false}).order("id").range(from,to));
  if(result.error)return {rosters:[],error:"Could not load shared rosters. Please retry."};
  const ids=[...new Set((result.data??[]).map(row=>row.owner_user_id))];
  const owners=ids.length?await db.from("profiles").select("user_id,display_name,first_name,last_name,username").in("user_id",ids):{data:[]};
  return {error:null,rosters:(result.data??[]).flatMap(row=>{const list=Array.isArray(row.list)?row.list[0]:row.list;if(!list)return [];return [{id:list.id,name:list.name,description:list.description,ownerName:name(owners.data?.find(p=>p.user_id===row.owner_user_id)),expiresAt:row.expires_at}];})};
}
export async function getSharedRoster(listId:string):Promise<{roster:SharedRoster|null;error:string|null}>{
  if(!idSchema.safeParse(listId).success)return {roster:null,error:"Shared roster not found."};
  const shared=await listRostersSharedWithMe();
  if(shared.error)return {roster:null,error:shared.error};
  const roster=shared.rosters.find(row=>row.id===listId);
  if(!roster)return {roster:null,error:"This roster is no longer shared with you. Access may have expired or been removed."};
  const db=await createServerSupabaseClient();if(!db)return {roster:null,error:"Connection unavailable. Please retry."};
  const members=await readPagedRows((from,to)=>db.from("talent_list_members").select("id,profile_id,added_at,notes").eq("list_id",listId).order("added_at",{ascending:false}).order("id").range(from,to));
  if(members.error)return {roster:null,error:"Could not load roster members. Please retry."};
  const cards=new Map<string,{profile_id:string;user_id:string|null;name:string;slug:string|null;location:string|null;avatar_url:string|null;styles:string[]|null}>();
  const rows=members.data??[];
  for(let index=0;index<rows.length;index+=200){const hydrated=await db.rpc("hydrate_library_member_cards",{p_profile_ids:rows.slice(index,index+200).map(row=>row.profile_id)});if(hydrated.error)return {roster:null,error:"Could not load talent details. Please retry."};for(const card of hydrated.data??[])cards.set(card.profile_id,card);}
  // Recheck access after all pages to avoid returning a roster revoked during hydration.
  const stillShared=await db.from("talent_list_user_shares").select("id").eq("list_id",listId).maybeSingle();
  if(stillShared.error||!stillShared.data)return {roster:null,error:"Access to this roster has changed. Refresh to continue."};
  return {error:null,roster:{...roster,members:rows.map(row=>{const card=cards.get(row.profile_id);return {id:row.id,profileId:row.profile_id,userId:card?.user_id??null,name:card?.name??"Profile unavailable",slug:card?.slug??null,location:card?.location??null,avatarUrl:card?.avatar_url??null,styles:card?.styles??[],notes:row.notes,unavailable:!card};})}};
}
