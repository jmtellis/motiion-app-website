import Link from "next/link";

export default function RootNotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-50">404</p>
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm opacity-70">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl border border-current/20 px-4 py-2 text-sm font-semibold"
        >
          Back to Motiion
        </Link>
      </div>
    </main>
  );
}
