import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scoreOpportunityMatch } from '../src/lib/search/talent-filter-logic';

const base = {location_city: 'Los Angeles', union_status: 'non-union', availability: 'available'};
test('incomplete talent profiles can load opportunity matches with null styles and skills', () => {
 assert.equal(scoreOpportunityMatch({...base, styles:null, skills:null}, {styles:['Jazz'], skills:['Acrobatics'], location:'Los Angeles, CA', union_status:'non-union'}),6);
 assert.equal(scoreOpportunityMatch({...base, styles:null, skills:['Acrobatics']}, {skills:['acrobatics']}),2);
 assert.equal(scoreOpportunityMatch({...base, styles:['Jazz'], skills:null}, {styles:['jazz']}),3);
 assert.equal(scoreOpportunityMatch(base, {}),0);
});
test('complete profiles retain weighted, case-insensitive matching', () => {
 assert.equal(scoreOpportunityMatch({...base, styles:['Jazz'], skills:['Acrobatics']}, {styles:['jazz'], skills:['acrobatics'], location:'Los Angeles, CA', union_status:'NON-UNION'}),11);
});
test('unavailable talent does not receive a match score', () => {
 assert.equal(scoreOpportunityMatch({...base, availability:'unavailable',styles:null,skills:null}, {location:'Los Angeles'}),0);
});
