import Link from "next/link";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function IndustryCheckoutSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : null;

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-white/42 uppercase">Industry Pro</p>
      <h1 className="text-3xl font-semibold text-white/92">You’re in</h1>
      <p className="text-sm leading-relaxed text-white/55">
        Your subscription is activating. If you started a trial, you have 60 days before billing
        begins. Founder codes unlock full access at no charge.
      </p>
      {sessionId ? (
        <p className="text-xs text-white/35">Checkout reference: {sessionId}</p>
      ) : null}
      <Link
        href="/dashboard"
        className="mt-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#0a0a0a] hover:bg-white/90"
      >
        Go to dashboard
      </Link>
      <Link href="/dashboard/settings" className="text-sm text-white/55 underline-offset-4 hover:underline">
        Manage billing
      </Link>
    </main>
  );
}
