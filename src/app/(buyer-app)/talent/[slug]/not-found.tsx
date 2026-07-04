import Link from "next/link";

export default function BuyerTalentProfileNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-[var(--ink)]">Profile not found</h1>
      <p className="text-sm text-[var(--ink-soft)]">
        This talent profile is unavailable or may have been removed.
      </p>
      <Link href="/talent" className="btn-primary text-sm">
        Back to Talent
      </Link>
    </div>
  );
}
