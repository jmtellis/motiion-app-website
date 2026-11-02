import assert from "node:assert/strict";
import test from "node:test";
import { allowsUser, blockedUserQuery, normalizeBlockedUserIds } from "../src/lib/app/blocked-visibility-model";
const id="aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
test("blocked identities are normalized, deduplicated, and cannot inject REST filters",()=>{
 const ids=normalizeBlockedUserIds([id,id.toUpperCase(),null,{},"bad),id.gt.0"]);
 assert.equal(ids.size,1);assert.equal(blockedUserQuery("id",ids),`&id=not.in.(${id})`);
 assert.equal(blockedUserQuery("user_id",new Set(["bad),id.gt.0"])),"");
});
test("known blocked actors are hidden while actorless system notices and group conversations remain",()=>{
 const ids=normalizeBlockedUserIds([id]);
 assert.equal(allowsUser(id.toUpperCase(),ids),false);assert.equal(allowsUser("bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb",ids),true);
 assert.equal(allowsUser(null,ids),true);assert.equal(allowsUser(undefined,ids),true);
 const rows=[{participant:id},{participant:null},{participant:"bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb"}];
 assert.deepEqual(rows.filter(row=>allowsUser(row.participant,ids)),rows.slice(1));
});
