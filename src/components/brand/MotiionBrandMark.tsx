import Image from "next/image";

/** Motiion emblem — vector template, crisp at any size. */
const EMBLEM_WIDTH = 220;
const EMBLEM_HEIGHT = 159;
export const MOTIION_WORDMARK_SRC = "/motiion-emblem.svg";
const HEADER_LOGO_SRC = MOTIION_WORDMARK_SRC;

/** Emblem aspect ratio (width / height) */
export const MOTIION_WORDMARK_ASPECT = EMBLEM_WIDTH / EMBLEM_HEIGHT;

/** Matches iOS `headerLogoDisplayHeight` (20pt). */
export const MOTIION_HEADER_LOGO_HEIGHT = 20;

/**
 * Motiion emblem lockup (stylized M + circle).
 * The SVG renders black by default; `brightness(0)` keeps it dark on light
 * headers and `brightness(0) invert` renders it white on dark backgrounds.
 */
export function MotiionBrandMark({
  height = MOTIION_HEADER_LOGO_HEIGHT,
  className = "",
  priority = false,
  inverted = false,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
  /** White emblem for dark backgrounds (hero, etc.). */
  inverted?: boolean;
}) {
  const width = Math.round((height * EMBLEM_WIDTH) / EMBLEM_HEIGHT);

  return (
    <Image
      src={HEADER_LOGO_SRC}
      alt=""
      width={width}
      height={height}
      priority={priority}
      unoptimized
      className={`block shrink-0 ${inverted ? "brightness-0 invert" : "brightness-0"} ${className}`}
      style={{ height, width, maxHeight: height, maxWidth: width }}
      aria-hidden
    />
  );
}
