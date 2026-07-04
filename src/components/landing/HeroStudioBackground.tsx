import Image from "next/image";

const DEFAULT_SRC = "/hero-studio-background.png";

export function HeroStudioBackground({
  src = DEFAULT_SRC,
  alt = "",
}: {
  src?: string;
  alt?: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0a0a0a]" aria-hidden>
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Vignette only — headshot layer handles bottom fade when stacked */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_50%,transparent_35%,rgba(0,0,0,0.45)_100%)]" />
    </div>
  );
}
