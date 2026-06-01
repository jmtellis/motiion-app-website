import Link from "next/link";

import { HeadshotColumnsBackground } from "@/components/landing/HeadshotColumnsBackground";

export function HomeAuthHeroSection({ headshotImages }: { headshotImages: string[] }) {
  return (
    <section
      id="hero"
      className="relative min-h-[calc(100svh-4.5rem)] overflow-hidden lg:min-h-screen lg:snap-start"
    >
      <HeadshotColumnsBackground images={headshotImages} />
      <div className="relative z-10 flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center px-6 py-16 lg:min-h-screen lg:px-10">
        <div className="animate-enter flex w-full max-w-3xl flex-col items-center gap-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1">
            <span className="inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
              Motiion for talent &amp; hiring teams
            </p>
          </div>

          <div className="space-y-4">
            <h1 className="text-balance text-4xl leading-[1.05] font-semibold tracking-tight text-[var(--ink)] sm:text-5xl lg:text-[2.75rem]">
              Your dance career network, <span className="text-[var(--accent-dark)]">online</span>.
            </h1>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-[var(--ink-soft)] sm:text-lg">
              Sign up to build your profile step by step. Log in anytime with the credentials you
              created.
            </p>
          </div>

          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup" className="btn-primary w-full text-center sm:w-auto sm:min-w-[10rem]">
              Sign up
            </Link>
            <Link href="/login" className="btn-outline w-full text-center sm:w-auto sm:min-w-[10rem]">
              Log in
            </Link>
          </div>

          <p className="text-sm text-[var(--ink-soft)]">
            Hiring teams can{" "}
            <Link href="/search" className="font-medium text-[var(--accent-dark)] underline underline-offset-4">
              browse talent
            </Link>{" "}
            without an account.
          </p>
        </div>
      </div>
    </section>
  );
}
