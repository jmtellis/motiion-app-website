export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#111111] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 lg:flex-row lg:items-end lg:justify-between lg:px-10">
        <div>
          <p className="text-lg font-semibold tracking-tight text-white">
            Motiion
          </p>
          <p className="mt-2 text-sm text-white/75">
            Built for the future of dance careers.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-5">
          {/* Replace links below with your production URLs. */}
          <a href="#" className="text-sm text-white/75 transition-colors hover:text-white">
            Instagram
          </a>
          <a href="#" className="text-sm text-white/75 transition-colors hover:text-white">
            Privacy Policy
          </a>
          <a href="#" className="text-sm text-white/75 transition-colors hover:text-white">
            Terms
          </a>
          <a
            href="mailto:hello@motiion.com"
            className="text-sm text-white/75 transition-colors hover:text-white"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
