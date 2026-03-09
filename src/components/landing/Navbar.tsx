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
          className="text-lg font-semibold tracking-tight text-[var(--ink)] transition-opacity hover:opacity-80"
          aria-label="Motiion home"
        >
          Motiion
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
