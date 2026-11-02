import Link from "next/link";
import { SignOutButton } from "@/components/talent-buyers/dashboard/SignOutButton";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/billing/stripe";
import { syncIndustrySubscription } from "@/lib/billing/sync-subscription";
import { getUserEntitlement } from "@/lib/billing/entitlement";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export const dynamic = "force-dynamic";
export default async function IndustryCheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : null;
  const db = await createServerSupabaseClient();
  const user = db ? (await db.auth.getUser()).data.user : null;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/payments/industry-success${sessionId ? `?session_id=${sessionId}` : ""}`)}`);
  let wrongAccount = false;
  let active = false;
  let trialEnds: string | null = null;
  let error: string | null = null;
  try {
    const stripe = getStripeClient();
    if (sessionId) {
      if (!stripe || !sessionId.startsWith("cs_")) throw new Error("Checkout could not be verified.");
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.client_reference_id !== user.id) { wrongAccount = true; throw new Error("This checkout belongs to another account. Sign in with the account used at checkout."); }
      if (session.mode !== "subscription") throw new Error("This checkout is not a subscription.");
      if (session.status !== "complete") throw new Error("Checkout is not complete. Return to Settings to finish or manage your subscription.");
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncIndustrySubscription(subscription, `checkout-reconcile:${session.id}`, undefined, user.id);
      }
    }
    const entitlement = await getUserEntitlement(user.id, "industry_pro");
    active = entitlement.active;
    trialEnds = entitlement.status === "trialing" ? entitlement.currentPeriodEnd : null;
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Could not verify checkout. Please retry.";
  }
  return <main className="mx-auto flex min-h-[75dvh] w-full max-w-xl flex-col justify-center gap-5 px-6 py-16 text-[var(--ui-text)]">
    <p className="text-sm font-semibold text-[var(--ui-accent)]">Industry Pro</p>
    <h1 className="text-3xl font-semibold tracking-tight">{active ? "Your Pro workspace is ready" : "Checking your subscription"}</h1>
    {active ? <p className="text-[var(--ui-muted)]">Your subscription is verified and Pro tools are available.{trialEnds ? ` Your trial runs until ${new Intl.DateTimeFormat("en-US", { dateStyle:"long",timeZone:"UTC" }).format(new Date(trialEnds))}. Manage or cancel it in billing settings.` : ""}</p>
      : <div className="ui-notice" data-tone={error ? "error" : undefined} role="status">{error ?? "Your payment provider is still confirming access. Refresh this page in a moment; you won’t be charged again."}</div>}
    <div className="flex flex-wrap gap-3">
      {active ? <Link href="/projects" className="ui-button">Go to projects</Link> : <form action="/payments/industry-success" method="get">{sessionId ? <input type="hidden" name="session_id" value={sessionId} /> : null}<button className="ui-button" type="submit">Check again</button></form>}
      {wrongAccount ? <SignOutButton className="ui-button ui-button--secondary" returnTo={`/payments/industry-success?session_id=${encodeURIComponent(sessionId ?? "")}`} label="Sign in with another account" /> : <Link href="/dashboard/settings?section=billing" className="ui-button ui-button--secondary">Manage billing</Link>}
    </div>
  </main>;
}
