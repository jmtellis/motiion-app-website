import Image from "next/image";

/** App `HeaderLogo` — `header-logo-wordmark.png` (white template, transparent background). */
const HEADER_LOGO_WIDTH = 504;
const HEADER_LOGO_HEIGHT = 300;
const HEADER_LOGO_SRC = "/header-logo-wordmark.png";

/** Matches iOS `headerLogoDisplayHeight` (20pt), slightly larger for web raster clarity. */
export const MOTIION_HEADER_LOGO_HEIGHT = 24;

/**
 * Full app header lockup from `HeaderLogo.imageset` (emblem + “motiion” wordmark).
 * The PNG is a white template; `brightness(0)` tints it dark on the light header
 * (same effect as SwiftUI `.renderingMode(.template)` + dark `foregroundStyle`).
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
  /** White wordmark for dark backgrounds (hero, etc.). */
  inverted?: boolean;
}) {
  const width = Math.round((height * HEADER_LOGO_WIDTH) / HEADER_LOGO_HEIGHT);

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
