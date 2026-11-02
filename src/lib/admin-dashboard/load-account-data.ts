import 'server-only';
import { requirePlatformAdmin } from '@/lib/auth/session';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import type { Source, Sources } from './model';

// Narrow per-account reads. Never use the old top-25 / recent-50 referral aggregate as lifetime totals.
export async function loadAccountData(userId: string): Promise<Sources> {
  await requirePlatformAdmin();
  const db=createAdminSupabaseClient();
  const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  const specs = [
    ['user_referrals','id,referrer_user_id,referee_user_id,created_at,source',`referrer_user_id.eq.${userId},referee_user_id.eq.${userId}`],
    ['session_join_requests','id,activity_id,requester_id,status,created_at',`requester_id.eq.${userId}`],
    ['activity_invites','id,activity_id,invited_user_id,is_active,response_status,created_at',`invited_user_id.eq.${userId}`],
    ['project_members','id,project_id,user_id,role,created_at',`user_id.eq.${userId}`],
    ['project_participants','id,project_id,user_id,added_at,removed_at',`user_id.eq.${userId}`],
    ['submissions','id,talent_id,role_id,status,submitted_at,roles(id,casting_id,title)',`talent_id.eq.${userId}`],
    ['bookings','id,project_id,talent_user_id,industry_user_id,status,work_title,completed_at,created_at',`talent_user_id.eq.${userId},industry_user_id.eq.${userId}`],
  ];
  async function read([table,columns,filter]: string[]): Promise<Source> {
    if (!valid || !db) return {rows:[],error:'Account data connection unavailable.'};
    const rows: Source['rows']=[];
    try {
      for (let from=0;from<100000;from+=1000) {
        const result=await db.from(table).select(columns,{count:'exact'}).or(filter).order('id').range(from,from+999);
        if (result.error) return {rows:[],error:`Source unavailable (${result.error.code || 'connection'}).`};
        rows.push(...(result.data??[]) as unknown as Source['rows']);
        if (result.count !== null && rows.length>=result.count) return {rows,error:null};
        if ((result.data?.length??0)<1000) break;
      }
      return {rows:[],error:'Incomplete account coverage; totals withheld.'};
    } catch { return {rows:[],error:'Account data could not be reached.'}; }
  }
  return Object.fromEntries(await Promise.all(specs.map(async spec=>[spec[0],await read(spec)])));
}
