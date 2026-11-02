import test from "node:test";
import assert from "node:assert/strict";
import { identitySessionBelongsTo, identitySessionOwner, shouldApplyIdentitySession } from "../src/lib/billing/identity-model";
test("mobile and historical web provider sessions resolve the same owner", () => { assert.equal(identitySessionOwner({supabase_user_id:'person'}),'person');assert.equal(identitySessionOwner({user_id:'person'}),'person');assert(identitySessionBelongsTo({supabase_user_id:'person',user_id:'person'},'person')); });
test("missing, mismatched, and conflicting metadata cannot establish identity", () => { assert(!identitySessionBelongsTo({},'person'));assert(!identitySessionBelongsTo({supabase_user_id:'other'},'person'));assert.equal(identitySessionOwner({supabase_user_id:'a',user_id:'b'}),null); });
test("late failure does not downgrade verified or overwrite a different session", () => { assert(!shouldApplyIdentitySession('vs_new','vs_old','processing','verified'));assert(!shouldApplyIdentitySession('vs_new','vs_new','verified','requires_input'));assert(shouldApplyIdentitySession('vs_new','vs_new','processing','verified')); });
