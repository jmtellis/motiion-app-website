import { businessKpis, phaseSource, verifiedProfessionals } from '@/lib/admin-dashboard/business-kpis';
import type { Sources } from '@/lib/admin-dashboard/model';

export function BusinessScorecard({sources}: {sources: Sources}) {
  const verified = verifiedProfessionals(sources);
  const cards = (later: boolean) => businessKpis.filter(k=>k.phase.includes('Later') === later).map(k=>{
    const current = k.key === 'verified' ? verified : null;
    return <article className="launch-card launch-business-kpi" key={k.key}>
      <div className="launch-eyebrow">{k.phase}</div><h3>{k.title}</h3>
      <div className="launch-kpi-current"><strong>{current === null ? '—' : current.toLocaleString()}</strong><span>{current === null ? 'Not measurable from current sources' : 'Current · dashboard account scope'}</span></div>
      <dl><dt>Documented target</dt><dd>{k.target}</dd><dt>Period / timing</dt><dd>{k.period}</dd></dl>
      <p className="launch-note">{k.definition}</p>
      {current === null && <p className="launch-kpi-gap">{k.gap}</p>}
      <a className="launch-link" href={`https://app.notion.com/p/${k.id}`} target="_blank" rel="noreferrer">KPI source ↗</a>
    </article>;
  });
  return <>
    <section className="launch-card launch-kpi-intro"><div className="launch-eyebrow">CURRENT OPERATING PRIORITY</div><h2>Phase 1 · Talent from live events</h2><p>Build the event-sourced talent pool, then convert to Pro, then grow bookings.</p><p className="launch-note">Targets reconciled against Notion on October 31, 2026. The September 5 phases decision explicitly supersedes five equal business goals; the October 26 brief still follows Phase 1. Model months have no confirmed calendar start, so no deadline or on-track status is inferred. These are sourced targets, not live Notion synchronization.</p><a className="launch-link" href={phaseSource} target="_blank" rel="noreferrer">Operating priorities & definitions ↗</a></section>
    <div className="launch-grid two launch-kpi-grid">{cards(false)}</div>
    <details className="launch-saved-goals"><summary>Later phases · Pro conversion & booking</summary><div className="launch-grid two launch-kpi-grid">{cards(true)}</div></details>
    <details className="launch-saved-goals"><summary>Target reconciliation & historical assumptions</summary><p className="launch-note">The app’s undated “end-of-year” constants (1,000 Pro, $30k MRR, $360k ARR) are now labeled Phase 2 stretch. Annual 100 classes / 100 sessions / 100 castings and 300 combined opportunities do not match the current hiring-only definition; creator supply KPIs were retired October 3. The older March 2025 business plan’s Year 1 50,000 subscribers / $2m revenue is historical, with no calendar year established. None of those figures is used to score the current phase. No target or history records have been overwritten.</p><a className="launch-link" href="https://app.notion.com/p/38ce739ec4ef80f8be9df2e9d2ec4bd4" target="_blank" rel="noreferrer">Full KPI library ↗</a></details>
  </>;
}
