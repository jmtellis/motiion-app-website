import Link from "next/link";
import { Archive, ArrowRight } from "lucide-react";

/** Old links stay understandable without restarting removed financial workflows. */
export function RetiredBookingNotice({ role }: { role: "talent" | "industry" }) {
  const industry = role === "industry";
  return <section className="ui-card mx-auto my-8 max-w-2xl rounded-2xl p-6 sm:p-10" aria-labelledby="retired-booking-title">
    <Archive size={28} aria-hidden className="mb-5 text-[var(--ink-soft)]" />
    <h1 id="retired-booking-title" className="text-2xl font-semibold tracking-tight text-[var(--ink)]">Booking contracts and payments have been retired</h1>
    <p className="mt-4 text-[var(--ink-soft)]">Motiion now supports casting, final selections, availability, and project coordination. This older link no longer opens an agreement or payment request.</p>
    <p className="mt-3 text-[var(--ink-soft)]">Historical records have not been deleted. For help with a previous agreement or transaction, contact <a className="underline" href="mailto:support@motiion.io">support@motiion.io</a>.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link className="ui-btn-primary inline-flex items-center gap-2" href={industry ? "/projects" : "/opportunities"}>{industry ? "Open projects" : "View opportunities"}<ArrowRight size={16} aria-hidden /></Link>
      <Link className="ui-btn-secondary" href={industry ? "/messages" : "/inbox"}>Open inbox</Link>
    </div>
  </section>;
}
