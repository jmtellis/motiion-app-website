import Image from "next/image";

/** Full Motiion wordmark (white-on-transparent PNG for dark surfaces). */
const WORDMARK_SRC = "/motiion-header-wordmark.png";
const WORDMARK_WIDTH = 1024;
const WORDMARK_HEIGHT = 132;

export const MOTIION_WORDMARK_HEIGHT = 16;

export function MotiionWordmark({
  height = MOTIION_WORDMARK_HEIGHT,
  className = "",
  priority = false,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const width = Math.round((height * WORDMARK_WIDTH) / WORDMARK_HEIGHT);

  return (
    <Image
      src={WORDMARK_SRC}
      alt=""
      width={width}
      height={height}
      priority={priority}
      className={`block shrink-0 ${className}`}
      style={{ height, width, maxHeight: height, maxWidth: width }}
      aria-hidden
    />
  );
}
