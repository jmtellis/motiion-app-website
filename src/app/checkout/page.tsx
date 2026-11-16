import Link from "next/link";
import { notFound } from "next/navigation";
import { isProjectPlan } from "@/lib/billing/project-catalog";
import { ProjectCheckoutButton } from "@/components/billing/ProjectCheckoutButton";
export default async function CheckoutPage({searchParams}: {searchParams: Promise<{plan?:string}>}) {
 const {plan} = await searchParams; if (!isProjectPlan(plan)) notFound();
 return <main className="mx-auto flex min-h-[80dvh] max-w-xl flex-col items-center justify-center gap-6 px-6 py-20 text-center">
  <h1 className="sr-only">Secure checkout</h1>
  <ProjectCheckoutButton key={plan} plan={plan}/><Link href="/pricing">Back to plans</Link>
 </main>;
}
