import type Stripe from "stripe";
import {getAppEnvironment} from "@/lib/environment";
import {SEAT_MONTHLY_ENV,SEAT_PASS_ENV,SEAT_MONTHLY_LOOKUP,SEAT_PASS_LOOKUP,seatPriceMatches} from "./team-seats";
/** Catalog setup runs with the existing server billing credential; never in a browser. */
export async function ensureTeamSeatCatalog(stripe:Stripe) {
 const result:{monthly?:string;pass?:string}={};
 for(const pass of [false,true]) {
  const lookup=pass?SEAT_PASS_LOOKUP:SEAT_MONTHLY_LOOKUP;
  const configured=process.env[pass?SEAT_PASS_ENV:SEAT_MONTHLY_ENV];
  const price=configured?await stripe.prices.retrieve(configured):(await stripe.prices.list({lookup_keys:[lookup],limit:2})).data[0];
  if(!price) throw new Error("Additional seats are unavailable until billing setup finishes.");
  if(!price.active||price.livemode!==(getAppEnvironment()==="production")||!seatPriceMatches(price,pass))throw new Error("Seat catalog configuration does not match the approved price.");
  result[pass?"pass":"monthly"]=price.id;
 }
 return result as {monthly:string;pass:string};
}
