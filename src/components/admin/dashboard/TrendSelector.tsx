'use client';
import { useState } from 'react';
import type { LaunchTrend } from '@/lib/admin-dashboard/trends';
import { TrendChart } from './TrendChart';

export function TrendSelector({trends}: {trends: LaunchTrend[]}) {
  const [kind, setKind] = useState('profiles');
  const selected = trends.find(t => t.kind === kind) ?? trends[0];
  return <section className="launch-card launch-trend-selector">
    <div className="launch-card-head"><h2>Trends over time</h2>
      <label><span className="launch-note">Show trend</span><select aria-label="Show trend" value={selected.kind} onChange={e=>setKind(e.target.value)}>{trends.map(t=><option key={t.kind} value={t.kind}>{t.kind === 'profiles' ? 'New profiles / signups' : t.title}</option>)}</select></label>
    </div>
    <TrendChart key={selected.kind} trend={selected}/>
  </section>;
}
