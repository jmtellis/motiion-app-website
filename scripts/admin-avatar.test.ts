import test from 'node:test';
import assert from 'node:assert/strict';
import { personImageCandidates } from '../src/lib/admin-dashboard/avatar.ts';

test('talent keeps ordered preferred headshot; industry prefers its separate picture', () => {
  const p={user_id:'one', account_type:'talent', headshot_urls:['https://example.com/first.jpg','https://example.com/second.jpg'],industry_avatar_url:'https://example.com/industry.jpg'};
  assert.deepEqual(personImageCandidates(p,false),[...p.headshot_urls,p.industry_avatar_url]);
  assert.deepEqual(personImageCandidates(p,true),[p.industry_avatar_url,...p.headshot_urls]);
});
test('invalid and duplicate candidates are skipped; signed URL is preserved', () => {
  const signed='https://example.com/storage/v1/object/sign/avatar/photo?token=existing-token';
  assert.deepEqual(personImageCandidates({headshot_urls:[' ', 'javascript:alert(1)', '/private/photo', 'https://secret:password@example.com/photo', signed,signed]}),[signed]);
});
test('industry-only profile resolves its image; missing photos never borrow company or another identity', () => {
  assert.deepEqual(personImageCandidates({user_id:'industry',account_type:'lookingForTalent',industry_avatar_url:'https://example.com/person.jpg'}),['https://example.com/person.jpg']);
  assert.deepEqual(personImageCandidates({user_id:'no-photo',company_logo:'https://example.com/logo.jpg',headshot_original_urls:['https://example.com/private.jpg']}),[]);
});
