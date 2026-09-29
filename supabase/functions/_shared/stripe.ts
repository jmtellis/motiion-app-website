import Stripe from "npm:stripe";
import { env } from "./env.ts";

export const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: "2024-06-20",
});
