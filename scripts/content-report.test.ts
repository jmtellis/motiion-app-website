import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contentReportSchema, reportReasons } from '../src/lib/settings/content-report';
const base = { contentType: 'profile', contentId: null, reportedUserId: '37b09855-aae1-46f4-a2e8-2c3ea5652a8d', reason: 'spam', details: '' };
test('user reports permit native reasons and require details for Other', () => {
  assert.equal(contentReportSchema.safeParse(base).success, true);
  assert.equal(contentReportSchema.safeParse({ ...base, reason: 'other' }).success, false);
  assert.equal(contentReportSchema.safeParse({ ...base, reason: 'other', details: 'Context to review' }).success, true);
  assert.equal(reportReasons.some(row => String(row.value) === 'block'), false);
});
test('reports validate IDs and bound details before RPC', () => {
  assert.equal(contentReportSchema.safeParse({ ...base, reportedUserId: 'another-user' }).success, false);
  assert.equal(contentReportSchema.safeParse({ ...base, details: 'x'.repeat(2001) }).success, false);
});
