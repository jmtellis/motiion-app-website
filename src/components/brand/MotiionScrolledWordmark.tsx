import Image from "next/image";

/** Canonical scrolled-header wordmark (white on transparent). */
const WORDMARK_SRC = "/motiion-header-wordmark.png";
const WORDMARK_WIDTH = 1024;
const WORDMARK_HEIGHT = 132;

export const MOTIION_SCROLLED_WORDMARK_SRC = WORDMARK_SRC;
export const MOTIION_SCROLLED_WORDMARK_HEIGHT = 12;

export function MotiionScrolledWordmark({
  height = MOTIION_SCROLLED_WORDMARK_HEIGHT,
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
