import nextEnv from '@next/env';
const {loadEnvConfig}=nextEnv;
import Stripe from 'stripe';
loadEnvConfig(process.cwd());
const key=process.env.STRIPE_SECRET_KEY;
if (!key || !/^(sk|rk)_test_/.test(key)) throw new Error('This provisioning script only operates in Stripe test mode.');
const stripe=new Stripe(key);
for (const [plan,name,amount,recurring,env] of [
 ['project_pass','Project Pass',19900,false,'STRIPE_PROJECT_PASS_PRICE_ID'],
 ['studio','Studio',14900,true,'STRIPE_STUDIO_PRICE_ID'],
 ['production_house','Production House',49900,true,'STRIPE_PRODUCTION_HOUSE_PRICE_ID'],
]) {
 const lookup=`motiion_${plan}_usd_v1`;
 const found=await stripe.prices.list({lookup_keys:[lookup],active:true});
 let price=found.data[0];
 if (!price) {
  const product=await stripe.products.create({name:`Motiion ${name}`,metadata:{project_plan:plan}},{idempotencyKey:`project-product-${plan}-v1`});
  price=await stripe.prices.create({product:product.id,currency:'usd',unit_amount:amount,lookup_key:lookup,...(recurring?{recurring:{interval:'month'}}:{})},{idempotencyKey:`project-price-${plan}-v1`});
 }
 if (price.livemode || price.unit_amount!==amount || price.currency!=='usd') throw new Error('Catalog mismatch');
 console.log(`${env}=${price.id}`);
}
