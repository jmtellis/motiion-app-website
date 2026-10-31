import { text, uniqueUsers, meaningfulEvents, isTalent, isIndustry, type Sources, type Row } from './model.ts';
export const trendLabels = { profiles: 'New profiles', talent: 'New talent profiles', industry: 'New industry profiles', projects: 'Projects created', opportunities: 'Opportunities created', rosters: 'Rosters created', activity: 'Observed active users', meaningful: 'Meaningfully active users' } as const;
export type TrendKind = keyof typeof trendLabels;
export function buildTrend(s: Sources, kind: TrendKind, days: number, end: string) {
  const keys = kind === 'opportunities' ? ['activities','castings'] : [kind === 'activity' || kind === 'meaningful' ? 'analytics_events' : kind === 'rosters' ? 'talent_lists' : ['talent','industry'].includes(kind) ? 'profiles' : kind];
  const unavailable = keys.some(k => !s[k] || s[k].error);
  const people = kind === 'activity' || kind === 'meaningful';
  const rows = keys.flatMap(k => (s[k]?.rows ?? []).filter(r => kind !== 'opportunities' || k !== 'activities' || ['class','session'].includes(text(r.type)))).filter(r => {
    if (kind === 'talent') return isTalent(r);
    if (kind === 'industry') return isIndustry(r);
    if (kind === 'rosters') return r.kind !== 'favorites';
    if (people) return Boolean(text(r.user_id)) && (kind !== 'meaningful' || meaningfulEvents.includes(text(r.event_name)));
    return true;
  });
  const endMs = Date.parse(end), dayMs = 86400000, start = endMs-days*dayMs;
  const dated = rows.map(row => ({row, time:Date.parse(text(row.created_at))})).filter(r => Number.isFinite(r.time));
  const within = (start: number, stop: number) => dated.filter(r => r.time>=start && r.time<stop).map(r => r.row);
  const count = (r: Row[]) => people ? uniqueUsers(r) : r.length;
  const points = Array.from({length: days},(_,i) => {
    const t=start+i*dayMs;
    return {date:new Date(t).toISOString(), previousDate:new Date(t-days*dayMs).toISOString(), current:count(within(t,t+dayMs)), previous:count(within(t-days*dayMs,t-(days-1)*dayMs))};
  });
  return {kind, title:trendLabels[kind], unavailable, people, points, current:count(within(start,endMs)), previous:count(within(start-days*dayMs,start)), missingDates:rows.length-dated.length, hasHistory:within(start-days*dayMs,endMs).length>0, start:new Date(start).toISOString(), end};
}
export type LaunchTrend = ReturnType<typeof buildTrend>;
