"use client";

import { useState } from "react";

import { getBuyerStockImage } from "@/lib/talent-buyers/stock-images";

type BuyerCoverImageProps = {
  src: string | null | undefined;
  alt?: string;
  aspectRatio?: "16/9" | "4/3" | "21/9";
  overlay?: boolean;
  className?: string;
  fill?: boolean;
  /** Used when src fails to load (e.g. stale DB URL) and stock is allowed. */
  fallbackId?: string;
  fallbackCategory?: "project" | "event";
  /** Secondary image (e.g. client logo) tried before stock / solid. */
  secondarySrc?: string | null;
  /** When false, empty/broken covers stay a solid color — no Unsplash stock. Default true. */
  allowStockFallback?: boolean;
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
          ? "pointer-events-none absolute inset-0 bg-gradient-to-t from-[#000000]/95 via-[#000000]/55 to-[#000000]/35"
          : "pointer-events-none absolute inset-0 bg-gradient-to-t from-[#000000]/88 via-[#000000]/35 to-[#000000]/15"
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
  fallbackSrc: string | null;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  if (failed && !fallbackSrc) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failed && fallbackSrc ? fallbackSrc : currentSrc}
      alt={alt}
      className="absolute inset-0 size-full object-cover"
      decoding="async"
      onError={() => {
        if (!failed && fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          return;
        }
        setFailed(true);
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
  fallbackCategory = "project",
  secondarySrc,
  allowStockFallback = true,
}: BuyerCoverImageProps) {
  const primary = src?.trim() || "";
  const secondary = secondarySrc?.trim() || "";
  const resolvedSrc = primary || secondary;
  const stockSrc =
    allowStockFallback && fallbackId
      ? getBuyerStockImage(fallbackId, fallbackCategory)
      : null;
  const errorFallback = secondary && primary ? secondary : stockSrc;

  const shellClass = fill
    ? `absolute inset-0 overflow-hidden bg-[#1e1e1e] ${className}`.trim()
    : `relative w-full overflow-hidden bg-[#1e1e1e] ${aspectClassNames[aspectRatio]} ${className}`.trim();

  return (
    <div className={shellClass}>
      {resolvedSrc ? (
        <CoverImg src={resolvedSrc} alt={alt} fallbackSrc={errorFallback} />
      ) : stockSrc ? (
        <CoverImg src={stockSrc} alt={alt} fallbackSrc={null} />
      ) : null}
      {overlay ? <CoverOverlay strong={fill} /> : null}
    </div>
  );
}
