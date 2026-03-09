export function Footer() {
  return (
    <footer className="border-t border-[var(--line)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:flex-row lg:items-end lg:justify-between lg:px-10">
        <div>
          <p className="text-lg font-semibold tracking-tight text-[var(--ink)]">
            Motiion
          </p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Built for the future of dance careers.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-5">
          {/* Replace links below with your production URLs. */}
          <a href="#" className="footer-link">
            Instagram
          </a>
          <a href="#" className="footer-link">
            Privacy Policy
          </a>
          <a href="#" className="footer-link">
            Terms
          </a>
          <a href="mailto:hello@motiion.com" className="footer-link">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
