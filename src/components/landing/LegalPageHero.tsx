import Link from "next/link";

export function LegalPageHero({
  title,
  updatedAt,
  intro,
}: {
  title: string;
  updatedAt: string;
  intro: string;
}) {
  return (
    <div className="animate-enter w-full max-w-4xl px-6 lg:px-10">
      <Link
        href="/"
        className="text-sm font-medium text-[#a3a3a3] transition-colors hover:text-[#fafafa]"
      >
        Back to home
      </Link>

      <header className="mt-6 border-b border-[#262626] pb-8">
        <p className="type-eyebrow text-[var(--accent)]">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#fafafa] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[#a3a3a3]">{updatedAt}</p>
        <p className="mt-5 text-base leading-relaxed text-[#a3a3a3]">{intro}</p>
      </header>
    </div>
  );
}
