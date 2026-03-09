export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 pt-16 pb-20 lg:grid-cols-2 lg:items-center lg:px-10 lg:pt-24">
      <div className="animate-enter">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1">
          <span className="inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
            Now in private beta
          </p>
        </div>

        <h1 className="mt-7 text-balance text-4xl leading-[1.05] font-semibold tracking-tight text-[var(--ink)] sm:text-5xl lg:text-6xl">
          Your dance career, organized in one place
        </h1>
        <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-[var(--ink-soft)] sm:text-lg">
          Motiion helps dancers manage headshots, resumes, reels, availability,
          and professional updates in one modern platform - built for the way
          the industry actually works.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a href="#signup" className="btn-primary">
            Join the Beta
          </a>
          <a href="#problem" className="btn-secondary">
            Learn More
          </a>
        </div>
      </div>

      <div className="animate-enter-delay">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-gradient-to-b from-white to-[var(--tone)] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.08)] sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]">
              Private Beta Preview
            </span>
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
            </div>
          </div>

          {/* Replace this preview card with product screenshots or renders. */}
          <div className="grid gap-4 rounded-2xl border border-[var(--line)] bg-white/95 p-4 sm:grid-cols-[1.2fr_1fr] sm:p-5">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--tone)] p-4">
              <p className="text-xs font-medium text-[var(--ink-soft)]">
                Profile Completeness
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--ink)]">
                92%
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-200">
                <div className="h-full w-[92%] rounded-full bg-[var(--accent)]" />
              </div>
            </div>
            <div className="rounded-xl border border-[var(--line)] p-4">
              <p className="text-xs font-medium text-[var(--ink-soft)]">
                Availability
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                Open next 2 weeks
              </p>
              <p className="mt-4 text-xs text-[var(--ink-soft)]">
                Updated 1h ago
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
