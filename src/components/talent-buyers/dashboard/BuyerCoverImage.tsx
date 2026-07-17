"use client";

import { useState } from "react";

import { getBuyerStockImage } from "@/lib/talent-buyers/stock-images";

type BuyerCoverImageProps = {
  src: string;
  alt?: string;
  aspectRatio?: "16/9" | "4/3" | "21/9";
  overlay?: boolean;
  className?: string;
  fill?: boolean;
  /** Used when src fails to load (e.g. stale DB URL). */
  fallbackId: string;
  fallbackCategory: "project" | "event";
};

const aspectClassNames = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "21/9": "aspect-[21/9]",
} as const;

function CoverOverlay({ strong = false }: { strong?: boolean }) {
  return (
    <div
      className={
        strong
          ? "pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/95 via-[#0a0a0a]/55 to-[#0a0a0a]/35"
          : "pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/88 via-[#0a0a0a]/35 to-[#0a0a0a]/15"
      }
      aria-hidden
    />
  );
}

function CoverImg({
  src,
  alt,
  fallbackSrc,
}: {
  src: string;
  alt: string;
  fallbackSrc: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      className="absolute inset-0 size-full object-cover"
      decoding="async"
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}

export function BuyerCoverImage({
  src,
  alt = "",
  aspectRatio = "16/9",
  overlay = false,
  className = "",
  fill = false,
  fallbackId,
  fallbackCategory,
}: BuyerCoverImageProps) {
  const fallbackSrc = getBuyerStockImage(fallbackId, fallbackCategory);

  if (fill) {
    return (
      <div className={`absolute inset-0 overflow-hidden bg-[#1e1e1e] ${className}`.trim()}>
        <CoverImg src={src} alt={alt} fallbackSrc={fallbackSrc} />
        {overlay ? <CoverOverlay strong /> : null}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#1e1e1e] ${aspectClassNames[aspectRatio]} ${className}`.trim()}
    >
      <CoverImg src={src} alt={alt} fallbackSrc={fallbackSrc} />
      {overlay ? <CoverOverlay /> : null}
    </div>
  );
}
