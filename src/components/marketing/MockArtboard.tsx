"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const MOCK_ARTBOARD_WIDTH = 1280;
export const MOCK_ARTBOARD_HEIGHT = 800;

/**
 * Locks scene content to a desktop 1280×800 composition, scaled to fill the
 * marketing scene viewport so responsive product UI never collapses.
 */
export function MockArtboard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const update = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      setScale(Math.min(width / MOCK_ARTBOARD_WIDTH, height / MOCK_ARTBOARD_HEIGHT));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="md-mock-host">
      <div
        className={`md-mock ${className}`.trim()}
        style={
          scale == null
            ? { width: MOCK_ARTBOARD_WIDTH, height: MOCK_ARTBOARD_HEIGHT, visibility: "hidden" }
            : {
                width: MOCK_ARTBOARD_WIDTH,
                height: MOCK_ARTBOARD_HEIGHT,
                transform: `scale(${scale})`,
              }
        }
      >
        {children}
      </div>
    </div>
  );
}
