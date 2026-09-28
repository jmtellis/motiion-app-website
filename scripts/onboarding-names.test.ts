import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialProfileNames, normalizeProfileNames, updateProfileNames } from '../src/lib/onboarding/names.ts';

test('fallback account names become empty inputs, including resumed drafts', () => {
  const empty = { firstName: '', lastName: '', displayName: '' };
  assert.deepEqual(initialProfileNames('Motiion User'), empty);
  assert.deepEqual(initialProfileNames('Motion User'), empty);
  assert.deepEqual(normalizeProfileNames({ firstName: 'Motiion', lastName: 'User', displayName: 'Motiion User' }), empty);
});
test('full name populates the display name and follows later name corrections', () => {
  let names = initialProfileNames('Motiion User');
  names = updateProfileNames(names, { firstName: 'Alex' });
  names = updateProfileNames(names, { lastName: 'Rivera' });
  assert.equal(names.displayName, 'Alex Rivera');
  assert.equal(updateProfileNames(names, { firstName: 'Alexandra' }).displayName, 'Alexandra Rivera');
  assert.equal(normalizeProfileNames({ firstName: 'Alex', lastName: 'Rivera', displayName: '' }).displayName, 'Alex Rivera');
});
test('a chosen display name survives edits to the legal name', () => {
  const names = { firstName: 'Alex', lastName: 'Rivera', displayName: 'Alex R' };
  assert.equal(updateProfileNames(names, { firstName: 'Alexandra' }).displayName, 'Alex R');
});
