import { text, type Row, type Sources } from './model.ts';

export type ReferralPerson = { userId: string; person?: Row; claimedAt: string; method: string };
/** Only successful claim_user_referral edges. Acquisition answers and event telemetry are not evidence. */
export function accountReferrals(userId: string, s: Sources) {
  const source = s.user_referrals;
  const unavailable = !source || Boolean(source.error);
  const excluded = new Set((s.admin_analytics_exclusions?.error ? [] : s.admin_analytics_exclusions?.rows ?? []).map(r=>text(r.user_id)));
  const profiles = new Map((s.profiles?.error ? [] : s.profiles?.rows ?? []).map(p=>[text(p.user_id),p]));
  const edges = (source?.rows ?? []).filter(r=>r.referrer_user_id === userId || r.referee_user_id === userId);
  const invalid = edges.some(r=>!text(r.referrer_user_id) || !text(r.referee_user_id));
  function related(incoming: boolean): ReferralPerson[] {
    if (unavailable || invalid) return [];
    const found = new Map<string, ReferralPerson>();
    for (const r of [...edges].sort((a,b)=>text(a.created_at).localeCompare(text(b.created_at)) || text(a.id).localeCompare(text(b.id)))) {
      const from=text(r.referrer_user_id), to=text(r.referee_user_id);
      if (from===to || excluded.has(from) || excluded.has(to) || (incoming ? to!==userId : from!==userId)) continue;
      const other=incoming ? from : to;
      if (!found.has(other)) found.set(other,{userId:other,person:profiles.get(other),claimedAt:text(r.created_at),method:text(r.source)});
    }
    return [...found.values()];
  }
  const referrers = related(true);
  const first = text(profiles.get(userId)?.referred_by_user_id);
  referrers.sort((a,b)=>Number(b.userId===first)-Number(a.userId===first));
  return { unavailable:unavailable || invalid, referrers, referred:related(false) };
}
