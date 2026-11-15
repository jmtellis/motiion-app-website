import Link from "next/link";
import { notFound } from "next/navigation";
import { PROJECT_CATALOG, isProjectPlan } from "@/lib/billing/project-catalog";
import { ProjectCheckoutButton } from "@/components/billing/ProjectCheckoutButton";
export default async function CheckoutPage({searchParams}: {searchParams: Promise<{plan?:string}>}) {
 const {plan} = await searchParams; if (!isProjectPlan(plan)) notFound(); const offer = PROJECT_CATALOG[plan];
 return <main className="mx-auto flex min-h-[80dvh] max-w-xl flex-col justify-center gap-6 px-6 py-20">
  <h1 className="text-4xl">Get started with {offer.name}</h1>
  <p className="text-2xl">${offer.amount/100} USD {offer.mode === "subscription" ? "/ month" : "one time"}</p>
  <p>{plan === "project_pass" ? "One project for 90 days from activation. The pass stays attached to that project and does not renew." : `${plan === "studio" ? "One active project and 3 team members" : "Five active projects and 10 team members"}. Renews monthly until canceled. Archive a project to free a slot.`}</p>
  <ProjectCheckoutButton plan={plan}/><Link href="/pricing">Back to products and services</Link>
 </main>;
}
