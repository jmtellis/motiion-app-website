import { currencyTotals, type Row, type Sources } from './model.ts';

export function recordedMoney(s: Sources, source: string, field: string, predicate: (r: Row) => boolean) {
  if (!s[source] || s[source].error) return 'Unavailable';
  const selected = s[source].rows.filter(predicate);
  if (!selected.length) return 'No recorded charges';
  const totals = currencyTotals(selected, field);
  return totals ? Object.entries(totals).map(([currency,cents]) => `${currency} ${new Intl.NumberFormat('en-US',{minimumFractionDigits:2, maximumFractionDigits:2}).format(cents/100)}`).join(' · ') : 'Amount or currency coverage incomplete';
}
