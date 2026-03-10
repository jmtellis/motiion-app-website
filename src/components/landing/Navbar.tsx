import Image from "next/image";

const links = [
  { label: "Product", href: "#product" },
  { label: "Beta", href: "#beta" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)]/80 bg-[var(--paper)]/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 lg:px-10">
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-[var(--ink)] transition-opacity hover:opacity-80"
          aria-label="Motiion home"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--ink)] p-1.5">
            <Image
              src="/motiion-icon.svg"
              alt=""
              width={16}
              height={16}
              className="h-full w-full"
              aria-hidden
            />
          </span>
          <span className="font-[var(--font-brand)] font-semibold tracking-[-0.02em]">
            motiion
          </span>
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a href="#signup" className="btn-primary text-sm">
          Join Beta
        </a>
      </div>
    </header>
  );
}
