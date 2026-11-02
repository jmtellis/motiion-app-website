import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergePortfolioCredits } from '../src/lib/profile/merge-portfolio-credits';

test('resume import preserves existing credit details and ignores repeated rows within an import', () => {
  const existing = { id: 'kept', title: 'Tour', roles: ['Dancer'], native_field: { retained: true } };
  const merged = mergePortfolioCredits([existing], [{ title: ' tour ', role: 'dancer' }, { title: 'Film', role: 'Dancer' }, { title: ' FILM ', role: 'Dancer' }], 'https://example.com/resume.pdf', () => 'new');
  assert.equal(merged.added, 1);
  assert.equal(merged.experiences[0], existing);
  assert.equal(merged.experiences[1].source_document_url, 'https://example.com/resume.pdf');
});
test('same project and role in a different year remain distinct credits', () => {
  const merged = mergePortfolioCredits([{ id: 'old', title: 'Tour', role: 'Dancer', start_date: '2025' }], [{ title: 'Tour', role: 'Dancer', start_date: '2026' }], 'https://example.com/r.pdf');
  assert.equal(merged.added, 1);
});
test('import retries do not append already imported credits', () => {
  const incoming = [{ title: 'New Show', role: 'Dancer', category: 'livePerformance', start_date: '2026' }];
  const first = mergePortfolioCredits([], incoming, 'https://example.com/r.pdf');
  const retried = mergePortfolioCredits(first.experiences, incoming, 'https://example.com/r.pdf');
  assert.equal(retried.added, 0);
  assert.equal(retried.experiences.length, 1);
});
