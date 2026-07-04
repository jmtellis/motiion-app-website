import Image from "next/image";

/** Motiion emblem — white template on transparent background. */
const EMBLEM_WIDTH = 1016;
const EMBLEM_HEIGHT = 655;
export const MOTIION_WORDMARK_SRC = "/motiion-emblem.png";
const HEADER_LOGO_SRC = MOTIION_WORDMARK_SRC;

/** Emblem aspect ratio (width / height) */
export const MOTIION_WORDMARK_ASPECT = EMBLEM_WIDTH / EMBLEM_HEIGHT;

/** Matches iOS `headerLogoDisplayHeight` (20pt). */
export const MOTIION_HEADER_LOGO_HEIGHT = 20;

/**
 * Motiion emblem lockup (stylized M + circle).
 * The PNG is a white template; `brightness(0)` tints it dark on light headers
 * and `brightness(0) invert` renders it white on dark backgrounds.
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
      className={`block shrink-0 ${inverted ? "brightness-0 invert" : "brightness-0"} ${className}`}
      style={{ height, width, maxHeight: height, maxWidth: width }}
      aria-hidden
    />
  );
}
