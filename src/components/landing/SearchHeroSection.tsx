import { HeroSearchBar } from "@/components/landing/HeroSearchBar";
import { HeadshotColumnsBackground } from "@/components/landing/HeadshotColumnsBackground";

export function SearchHeroSection({ headshotImages }: { headshotImages: string[] }) {
  return (
    <section
      id="search-hero"
      className="relative min-h-[calc(100svh-4.5rem)] overflow-hidden lg:min-h-screen lg:snap-start"
    >
      <HeadshotColumnsBackground images={headshotImages} />
      <div className="relative z-10 flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center px-6 py-16 lg:min-h-screen lg:px-10">
        <div className="animate-enter flex w-full max-w-5xl flex-col items-center gap-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1">
            <span className="inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--accent)] uppercase">
              Premium search for dance talent
            </p>
          </div>

          <div>
            <h1 className="text-balance text-4xl leading-[1.05] font-semibold tracking-tight text-[var(--ink)] sm:text-5xl lg:text-[2.75rem]">
              The search for <span className="text-[var(--accent-dark)]">professional</span> dance talent
              made easy.
            </h1>
          </div>

          <HeroSearchBar />

          <div className="grid w-full max-w-4xl gap-3 pt-4 text-left sm:grid-cols-3">
            {[
              "Search-safe public profiles only",
              "Built for talent and hiring teams",
              "Profiles with reels, credits, and filters",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm leading-relaxed text-[var(--ink-soft)] backdrop-blur-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
