import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeJoinReferralCode, joinPagePath } from '../src/lib/referrals/code';
import { referralClaimMessage } from '../src/lib/referrals/claim';

test('referral normalization accepts native usernames/UUID and safely rejects malformed URLs', () => {
  assert.equal(normalizeJoinReferralCode('@Taylor_Parity'), 'taylor_parity');
  assert.equal(normalizeJoinReferralCode('37B09855-AAE1-46F4-A2E8-2C3EA5652A8D'), '37b09855-aae1-46f4-a2e8-2c3ea5652a8d');
  assert.equal(normalizeJoinReferralCode('%E0%A4%A'), '');
  assert.equal(joinPagePath('taylor_parity'), '/join/taylor_parity');
});
test('referral limits distinguish expired, self and unknown codes', () => {
  assert.match(referralClaimMessage('account_too_old'), /48 hours/);
  assert.match(referralClaimMessage('self_referral'), /person who invited/);
  assert.match(referralClaimMessage('referrer_not_found'), /couldn’t find/);
});
