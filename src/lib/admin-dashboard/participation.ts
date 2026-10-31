import { text, obj, owner, type Row, type Sources } from './model.ts';
export type ParticipationMetric = {key:string; label:string; count:number|null; note:string; items:Row[]};
export function accountParticipation(userId:string,s:Sources): ParticipationMetric[] {
  const rows=(key:string)=>s[key]?.rows??[];
  const ok=(...keys:string[])=>keys.every(k=>s[k] && !s[k].error);
  const unique=(items:Row[])=>[...new Map(items.map(r=>[text(r.id),r])).values()];
  const activityIds = new Set([
    ...rows('enrollments').filter(r=>r.student_id===userId && ['paid','guest','comped'].includes(text(r.status))).map(r=>text(r.activity_id)),
    ...rows('session_join_requests').filter(r=>r.requester_id===userId && r.status==='approved').map(r=>text(r.activity_id)),
    ...rows('activity_invites').filter(r=>r.invited_user_id===userId && r.is_active===true && r.response_status==='accepted').map(r=>text(r.activity_id)),
  ]);
  const activities=rows('activities').filter(r=>activityIds.has(text(r.id)) && !['cancelled','canceled','draft'].includes(text(r.status)));
  const activityCoverage=ok('activities','enrollments','session_join_requests','activity_invites') && [...activityIds].every(id=>id && rows('activities').some(r=>r.id===id));
  const submissions=rows('submissions').filter(r=>r.talent_id===userId && ['pending','approved','rejected','callback'].includes(text(r.status)) && Number.isFinite(Date.parse(text(r.submitted_at))));
  const castingIds=new Set(submissions.map(r=>text(obj(r.roles).casting_id)).filter(Boolean));
  const unmapped=submissions.filter(r=>!text(obj(r.roles).casting_id)).length;
  const castings=[...castingIds].map(id=>rows('castings').find(r=>r.id===id)??{id,title:'Casting details unavailable'});
  const projectIds=new Set([
    ...rows('project_members').filter(r=>r.user_id===userId && r.role!=='owner').map(r=>text(r.project_id)),
    ...rows('project_participants').filter(r=>r.user_id===userId && !r.removed_at).map(r=>text(r.project_id)),
  ].filter(Boolean));
  const projects=rows('projects').filter(r=>projectIds.has(text(r.id)) && owner(r)!==userId);
  const bookings=unique(rows('bookings').filter(r=>(r.talent_user_id===userId || r.industry_user_id===userId) && r.status==='completed'));
  const metric=(key:string,label:string,available:boolean,items:Row[],note:string):ParticipationMetric=>({key,label,count:available?unique(items).length:null,items:available?unique(items):[],note});
  return [
    metric('sessions','Sessions joined',activityCoverage,activities.filter(r=>r.type==='session'),'All-time retained approved joins, accepted active invites or paid/guest/comped enrollment; not verified attendance. Cancelled activities excluded.'),
    metric('castings','Castings submitted to',ok('submissions') && !unmapped,castings,unmapped?`${unmapped} submitted role records lack a casting link; total withheld.`:'Distinct castings with a dated pending, approved, rejected or callback submission. Drafts, withdrawn/cancelled records and anonymous external submissions excluded.'),
    metric('projects','Projects joined',ok('project_members','project_participants','projects') && [...projectIds].every(id=>rows('projects').some(r=>r.id===id)),projects,'Current distinct project memberships or non-removed roster participation. Owned projects are separate; this is not lifetime completed work.'),
    metric('classes','Classes registered',activityCoverage,activities.filter(r=>r.type==='class'),'All-time retained paid/guest/comped enrollments or accepted active invites; cancelled/refunded enrollment and cancelled classes excluded. Not attendance.'),
    metric('bookings','Bookings completed',ok('bookings'),bookings,'Distinct booking records explicitly marked completed; payment or a signed memo alone does not count.'),
  ];
}
