import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBirthDateAge } from '../src/lib/onboarding/birth-date.ts';

test('age gate changes on the eighteenth birthday using calendar dates', () => {
  const today = new Date(2026, 8, 27, 0, 1);
  assert.equal(getBirthDateAge('2008-09-27', today), 18);
  assert.equal(getBirthDateAge('2008-09-28', today), 17);
  assert.equal(getBirthDateAge('2008-09-26', today), 18);
});
test('invalid, incomplete, impossible and future birthdays cannot pass the gate', () => {
  const today = new Date(2026, 8, 27);
  for (const value of ['', '2000-2-01', '2000-02-30', '2001-02-29', '2000-13-01', 'not-a-date', '2027-01-01']) {
    assert.ok(getBirthDateAge(value, today) < 18, value);
  }
  assert.equal(getBirthDateAge('2000-02-29', today), 26);
});
test('leap-day birthday reaches eighteen on March 1 in non-leap years', () => {
  assert.equal(getBirthDateAge('2008-02-29', new Date(2026, 1, 28)), 17);
  assert.equal(getBirthDateAge('2008-02-29', new Date(2026, 2, 1)), 18);
});
