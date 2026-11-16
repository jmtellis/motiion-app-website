import assert from 'node:assert/strict';
import test from 'node:test';
import { previewRoleOverlap } from '../src/lib/talent-navigator/preview-role-overlap';
import type { BuyerOpenRole } from '../src/lib/talent-navigator/open-roles';
const role: BuyerOpenRole = { id: 'role', name: 'Dancer', projectId: 'project', projectTitle: 'Tour', castingId: 'casting', castingTitle: 'Tour cast', matchFilters: { skills: ['Partnering'] }, gender: 'Female', unionStatus: null, ethnicityPreferences: ['test'], locationRequirements: [], danceStyles: ['Jazz'] };
test('preview exposes explicit professional-tag overlaps, without a fit score', () => {
  const result = previewRoleOverlap({ styles: [' jazz '], skills: ['partnering'] }, [role]);
  assert.deepEqual(result[0].sharedStyles, ['Jazz']);
  assert.deepEqual(result[0].sharedSkills, ['Partnering']);
  assert.equal(result.length, 1);
});
test('demographic criteria cannot produce a recommendation', () => {
  assert.deepEqual(previewRoleOverlap({ styles: ['Ballet'], skills: [] }, [role]), []);
});
test('legacy style fields are supported and malformed tags do not break the panel', () => {
  const legacy = { ...role, danceStyles: [], matchFilters: { genres: ['Jazz', null, 3], skills: 'invalid' } };
  assert.deepEqual(previewRoleOverlap({ styles: ['jazz'] }, [legacy])[0].sharedStyles, ['Jazz']);
  assert.deepEqual(previewRoleOverlap({}, [legacy]), []);
});
