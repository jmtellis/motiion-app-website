import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/billing/stripe";
import { syncProjectCheckout } from "@/lib/billing/project-sync";
export default async function Success({searchParams}: {searchParams: Promise<{session_id?:string}>}) {
 const {session_id:id} = await searchParams;
 const db = await createServerSupabaseClient(); const user = db ? (await db.auth.getUser()).data.user : null;
 if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/success?session_id=${id ?? ""}`)}`);
 let ready = false; let message = "Your payment is being confirmed. Check again in a moment.";
 try {const stripe=getStripeClient(); if (!stripe || !id?.startsWith("cs_")) throw new Error("Checkout could not be verified.");
 const session=await stripe.checkout.sessions.retrieve(id);
 if (session.client_reference_id !== user.id) throw new Error("Sign in with the account used for this purchase.");
 ready=await syncProjectCheckout(session, stripe);
 } catch(error) {message=error instanceof Error ? error.message : message;}
 return <main className="mx-auto flex min-h-[80dvh] max-w-xl flex-col justify-center gap-6 px-6"><h1 className="text-3xl">{ready ? "Your purchase is ready" : "Confirming your purchase"}</h1>
 <p>{ready ? "Your purchase is saved to your Motiion account and available on web and iOS. Unused passes activate when you start a project beyond your monthly capacity." : message}</p>
 {ready ? <Link href="/projects">Go to projects</Link> : <Link href={`/checkout/success?session_id=${encodeURIComponent(id ?? "")}`}>Check again</Link>}<Link href="/dashboard/settings?section=billing">View billing</Link></main>;
}
