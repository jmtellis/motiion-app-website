import test from 'node:test';
import assert from 'node:assert/strict';
import { isOwnedResumePath, MAX_RESUME_PAGE_BYTES, resumePagesError, resumeSourceError } from '../src/lib/onboarding/resume-upload';
const owner='5b2712a7-1b42-4f03-8228-940d3167427b';
const path=`${owner}/resume_44b20ad7-f0a2-4ff2-b147-ff707327525f.pdf`;
test('resume processing accepts only an exact owned storage path',()=>{
 assert.equal(isOwnedResumePath(path,owner),true);
 for(const value of [path.replace(owner,'c3227206-9450-4b36-b776-a544b5f95df3'),`https://host/${path}`,`../${path}`,path.replace('/','%2F'),`${path}?x`,`${path}/../x`,null])assert.equal(isOwnedResumePath(value,owner),false);
});
test('stored source metadata permits 20 MB PDF originals, rejects unknown or oversized files',()=>{
 assert.equal(resumeSourceError(20*1024*1024,'application/pdf'),null);
 assert.equal(resumeSourceError(9000,'image/jpeg'),null);
 assert.ok(resumeSourceError(undefined,'application/pdf'));assert.ok(resumeSourceError(21*1024*1024,'application/pdf'));assert.ok(resumeSourceError(100,'text/html'));
});
test('extraction payload stays below the hosting limit and requires real image pages',()=>{
 const page={size:MAX_RESUME_PAGE_BYTES,type:'image/jpeg'};
 assert.equal(resumePagesError([page,page,page]),null);
 assert.ok(3*MAX_RESUME_PAGE_BYTES<4.5*1000*1000);
 assert.ok(resumePagesError([]));assert.ok(resumePagesError([page,page,page,page]));assert.ok(resumePagesError([{...page,size:page.size+1}]));assert.ok(resumePagesError([{...page,type:'application/pdf'}]));
});
