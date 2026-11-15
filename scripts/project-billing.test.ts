import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PROJECT_CATALOG,isProjectPlan,receiptIsActive,type ProjectReceipt} from '../src/lib/billing/project-catalog';
import {projectPurchaseCall} from '../supabase/functions/_shared/project-purchases';
const now=Date.parse('2026-11-15T00:00:00Z');
const receipt:ProjectReceipt={id:'pass',plan:'project_pass',provider:'stripe',status:'active',expires_at:null,project_id:null,activated_at:null};
test('unused pass remains available; activated, expired, or revoked receipts do not grant permanent access',()=>{
 assert.equal(receiptIsActive(receipt,now),true);
 assert.equal(receiptIsActive({...receipt,activated_at:'2026-01-01'},now),false);
 assert.equal(receiptIsActive({...receipt,expires_at:'2026-11-14'},now),false);
 assert.equal(receiptIsActive({...receipt,status:'revoked'},now),false);
 assert.equal(receiptIsActive({...receipt,plan:'studio'},now),false);
});
test('only explicit plan identifiers are accepted',()=>{
 for(const key of Object.keys(PROJECT_CATALOG)) assert.equal(isProjectPlan(key),true);
 for(const key of ['__proto__','constructor','industry_pro','',null]) assert.equal(isProjectPlan(key),false);
});
const event={product_id:'com.motiion.project.pass',app_user_id:'11111111-1111-4111-8111-111111111101',transaction_id:'tx_1',type:'NON_RENEWING_PURCHASE',event_timestamp_ms:now};
test('Apple passes use transaction identity, not notification identity',()=>{
 const a=projectPurchaseCall({...event,id:'event_a'}),b=projectPurchaseCall({...event,id:'event_b'});
 assert.deepEqual(a,b);assert.equal(a?.p_external_id,'tx_1');assert.equal(a?.p_expires_at,null);
});
test('Apple refunds revoke passes, and subscription cancellation retains paid access until expiry',()=>{
 assert.equal(projectPurchaseCall({...event,type:'CANCELLATION',cancel_reason:'CUSTOMER_SUPPORT'})?.p_status,'revoked');
 assert.equal(projectPurchaseCall({...event,product_id:'com.motiion.studio.monthly',original_transaction_id:'original_1',expiration_at_ms:now+86400000,type:'CANCELLATION',cancel_reason:'UNSUBSCRIBE'})?.p_status,'active');
});
test('invalid identity and missing monthly expiry fail closed',()=>{
 for (const product_id of ['__proto__','constructor','toString']) assert.equal(projectPurchaseCall({...event,product_id}),null);
 assert.throws(()=>projectPurchaseCall({...event,app_user_id:'anonymous'}));
 assert.throws(()=>projectPurchaseCall({...event,product_id:'com.motiion.studio.monthly',original_transaction_id:'tx'}));
});
