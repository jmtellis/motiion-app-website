import test from 'node:test';
import assert from 'node:assert/strict';
import {industryReviewProfile,industryReviewWebsite} from '../src/lib/admin-dashboard/industry-review.ts';
test('review context joins only the exact applicant and prefers their Industry image',()=>{
 const rows=[{user_id:'other',industry_avatar_url:'https://example.com/wrong.jpg',acquisition_source:'instagram'}, {user_id:'applicant',industry_avatar_url:'https://example.com/right.jpg',headshot_urls:['https://example.com/headshot.jpg'],acquisition_source:'friend_or_referral',acquisition_source_detail:'Fictional workshop'}];
 assert.deepEqual(industryReviewProfile('applicant',{rows,error:null}),{status:'available',imageUrls:['https://example.com/right.jpg','https://example.com/headshot.jpg'],acquisitionSource:'Friend or referral',acquisitionDetail:'Fictional workshop'});
});
test('missing, unavailable and absent fields remain distinct without borrowing another profile',()=>{
 assert.equal(industryReviewProfile('missing',{rows:[{user_id:'other'}],error:null}).status,'missing');
 assert.deepEqual(industryReviewProfile('a',{rows:[{user_id:'a',industry_avatar_url:'https://example.com/a.jpg'}],error:'failed'}),{status:'unavailable',imageUrls:[],acquisitionSource:'Not recorded',acquisitionDetail:'Not provided'});
 assert.equal(industryReviewProfile('a',{rows:[{user_id:'a'}],error:null}).acquisitionSource,'Not recorded');
});
test('website context permits only credential-free HTTP links',()=>{
 for(const raw of ['', 'javascript:alert(1)','https://secret:password@example.com'])assert.equal(industryReviewWebsite(raw),null);
 assert.equal(industryReviewWebsite('https://example.com/portfolio'),'https://example.com/portfolio');
});
