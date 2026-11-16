// Run with node --import tsx scripts/staging-checkout-copy.ts [--apply].
// Test catalog only. Without --apply, validates and prints the proposed copy.
import nextEnv from '@next/env';
import Stripe from 'stripe';
nextEnv.loadEnvConfig(process.cwd());
const key=process.env.STRIPE_SECRET_KEY;
if (!key || !/^(sk|rk)_test_/.test(key)) throw new Error('Test key required');
const stripe = new Stripe(key, {apiVersion:'2026-06-24.dahlia'});
const offers = [
 ['STRIPE_PROJECT_PASS_PRICE_ID',19900,'Motiion Project Pass','One project · 90 days from activation · 3 team members. Includes casting and cast coordination. One-time payment; no renewal.'],
 ['STRIPE_STUDIO_PRICE_ID',14900,'Motiion Studio','1 active project · 3 team members. Includes casting and cast coordination. Wrap a project to reuse your slot. Renews monthly until canceled.'],
 ['STRIPE_PRODUCTION_HOUSE_PRICE_ID',49900,'Motiion Production House','5 active projects · 10 team members. Includes casting and cast coordination. Wrap projects to reuse your slots. Renews monthly until canceled.'],
];
(async()=>{for(const [env,amount,name,description] of offers){
 const price=await stripe.prices.retrieve(process.env[env as string]!,{expand:['product']});
 if(price.livemode || price.unit_amount!==amount || price.currency!=='usd' || !price.active || typeof price.product === 'string' || price.product.deleted || price.product.livemode) throw new Error('Unexpected test catalog');
 if (process.argv.includes('--apply')) await stripe.products.update(price.product.id,{name:name as string,description:description as string});
 console.log(JSON.stringify({name,description,testMode:!price.livemode}));
}})().catch(e=>{console.error(e.message);process.exitCode=1;});
