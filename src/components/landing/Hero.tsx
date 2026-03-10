import Image from "next/image";

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

      <div className="animate-enter-delay flex flex-col items-center">
        <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]">
          Private Beta Preview
        </span>
        <Image
          src="/hero-private-beta-preview-v2.png"
          alt="Three app screens previewing the private beta experience."
          width={1740}
          height={1964}
          priority
          className="mt-6 h-auto w-full max-w-[34rem]"
          sizes="(min-width: 1024px) 40vw, (min-width: 640px) 70vw, 90vw"
        />
      </div>
    </section>
  );
}
