"use client";
import { RefreshCw } from "lucide-react";
export default function ProjectsError({ reset }: { reset: () => void }) {
  return <section className="mx-auto max-w-xl px-6 py-16" role="alert">
    <h1 className="text-2xl font-semibold text-[var(--ink)]">Your projects could not be loaded</h1>
    <p className="mt-3 text-[var(--ink-soft)]">Your work is still saved. Check your connection, then try again.</p>
    <button className="bd-btn-accent mt-6" onClick={reset}><RefreshCw size={16} aria-hidden /> Try again</button>
  </section>;
}
