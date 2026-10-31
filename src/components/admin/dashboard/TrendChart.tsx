'use client';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { LaunchTrend } from '@/lib/admin-dashboard/trends';
const day = (s:string) => new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
export function TrendChart({trend:t}: {trend:LaunchTrend}) {
  const delta=t.current-t.previous;
  return <section className="launch-card launch-trend">
    <h2>{t.title}</h2>
    <p className="launch-note">{day(t.start)} – {day(t.end)} · {t.points.length} days · UTC</p>
    {t.unavailable ? <p className="launch-empty">History unavailable — source could not be loaded.</p> : !t.hasHistory ? <p className="launch-empty">Insufficient history — no dated records in either period.</p> : <>
      <div className="launch-trend-total"><strong>{t.current.toLocaleString()}</strong><span>{delta>0?'+':''}{delta.toLocaleString()} vs {t.previous.toLocaleString()} in prior {t.points.length} days{t.people?' · unique people per period':''}</span></div>
      <div className="launch-trend-legend"><span>━ Selected period</span><span>┄ Previous period · aligned by day</span></div>
      <div className="launch-trend-plot" role="img" aria-label={`${t.title}: ${t.current} selected, ${t.previous} previous. Daily values in the table below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={t.points} margin={{top:12,right:12,left:-16,bottom:6}} accessibilityLayer>
            <CartesianGrid stroke="var(--la-line)" strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="date" tickFormatter={day} minTickGap={40} tick={{fill:'var(--la-muted)',fontSize:12}} tickLine={false}/>
            <YAxis allowDecimals={false} tick={{fill:'var(--la-muted)',fontSize:12}} tickLine={false} width={48}/>
            <Tooltip labelFormatter={(v) => `${day(String(v))} · interval start (UTC)`} contentStyle={{background:'#fff',border:'1px solid #dedede',borderRadius:8,color:'#242424'}}/>
            <Line type="linear" dataKey="previous" name="Previous period" stroke="#74658f" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false}/>
            <Line type="linear" dataKey="current" name="Selected period" stroke="var(--la-accent-ink)" strokeWidth={2.5} dot={t.points.length<=7} isAnimationActive={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="launch-note">{t.people?'Distinct signed-in people in each 24-hour interval; daily values are not additive. Telemetry may be incomplete.':'Records created per 24-hour interval; not historical active inventory. Deleted records cannot be reconstructed.'}</p>
      <details className="launch-note"><summary>View daily values & comparison dates</summary><div className="launch-table-wrap"><table><thead><tr><th>UTC start</th><th>Selected</th><th>Prior start</th><th>Previous</th></tr></thead><tbody>{t.points.map(p=><tr key={p.date}><td>{day(p.date)}</td><td>{p.current}</td><td>{day(p.previousDate)}</td><td>{p.previous}</td></tr>)}</tbody></table></div></details>
    </>}
    {["talent","industry"].includes(t.kind) && <p className="launch-note">Current account type · directory filters do not change this chart.</p>}
    {t.kind === "opportunities" && <p className="launch-note">Classes, sessions and castings created, across all current statuses and visibility settings.</p>}
    {t.missingDates>0 && <p className="launch-note">{t.missingDates} records omitted: creation date not recorded.</p>}
  </section>;
}
