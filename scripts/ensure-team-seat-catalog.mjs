// Idempotent production release setup. Runs inside Vercel; credentials never leave it.
import Stripe from 'stripe';
if(process.env.VERCEL_ENV==='production') {
 if(!process.env.STRIPE_SECRET_KEY?.includes('_live_')) throw new Error('Live Stripe billing credential required for production');
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY,{apiVersion:'2026-06-24.dahlia'});
 const account=await stripe.accounts.retrieve();
 if(account.id!=='acct_1T3aJLJefpu9FPzf') throw new Error('Seat catalog setup must target Motiion');
 for(const [lookup,amount,monthly,name,env] of [
  ['motiion_team_seat_monthly_v1',1500,true,'Motiion additional team seat','STRIPE_TEAM_SEAT_MONTHLY_PRICE_ID'],
  ['motiion_team_seat_pass_v1',3900,false,'Motiion Project Pass additional seat','STRIPE_TEAM_SEAT_PASS_PRICE_ID'],
 ]) {
  const configured=process.env[env];
  const existing=configured?await stripe.prices.retrieve(configured):(await stripe.prices.list({lookup_keys:[lookup],limit:2})).data[0];
  const price=existing??await stripe.prices.create({currency:'usd',unit_amount:amount,lookup_key:lookup,product_data:{name,unit_label:'seat'},...(monthly?{recurring:{interval:'month',interval_count:1,usage_type:'licensed'}}:{})},{idempotencyKey:lookup});
  if(!price.active||!price.livemode||price.currency!=='usd'||price.unit_amount!==amount||(monthly?(price.recurring?.interval!=='month'||price.recurring.interval_count!==1):price.type!=='one_time'))throw new Error('Seat catalog does not match approved pricing');
  console.log(`Verified ${lookup}: ${price.id} ($${amount/100}${monthly?'/month':''})`);
 }
}
