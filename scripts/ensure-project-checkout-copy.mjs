// Approved production checkout copy. Runs using Vercel's own billing credential.
import Stripe from "stripe";
if (process.env.VERCEL_ENV === "production") {
  if (!/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "")) throw new Error("Live billing credential required");
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {apiVersion:"2026-06-24.dahlia"});
  if ((await stripe.accounts.retrieve()).id !== "acct_1T3aJLJefpu9FPzf") throw new Error("Unexpected Stripe account");
  const offers = [
    ["STRIPE_PROJECT_PASS_PRICE_ID",19900,false,"Motiion Project Pass","One project · 90 days from activation · 3 team members. Includes casting and cast coordination. One-time payment; no renewal."],
    ["STRIPE_STUDIO_PRICE_ID",14900,true,"Motiion Studio","1 active project · 3 team members. Includes casting and cast coordination. Wrap a project to reuse your slot. Renews monthly until canceled."],
    ["STRIPE_PRODUCTION_HOUSE_PRICE_ID",49900,true,"Motiion Production House","5 active projects · 10 team members. Includes casting and cast coordination. Wrap projects to reuse your slots. Renews monthly until canceled."],
  ];
  const verified = [];
  for (const [env,amount,monthly,name,description] of offers) {
    if (!process.env[env]) throw new Error(`Missing ${env}`);
    const price = await stripe.prices.retrieve(process.env[env], {expand:["product"]});
    if (!price.active || !price.livemode || price.currency !== "usd" || price.unit_amount !== amount || typeof price.product === "string" || price.product.deleted || !price.product.active || !price.product.livemode || (monthly ? price.recurring?.interval !== "month" || price.recurring.interval_count !== 1 : price.type !== "one_time")) throw new Error(`Unexpected catalog for ${name}`);
    verified.push({product:price.product,name,description});
  }
  for (const {product,name,description} of verified) {
    if (product.name !== name || product.description !== description) await stripe.products.update(product.id, {name,description});
    const result = await stripe.products.retrieve(product.id);
    if (result.name !== name || result.description !== description) throw new Error(`Checkout copy verification failed for ${name}`);
    console.log(`Verified production checkout summary: ${name}`);
  }
}
