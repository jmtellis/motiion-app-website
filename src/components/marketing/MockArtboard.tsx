"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const MOCK_ARTBOARD_WIDTH = 1280;
export const MOCK_ARTBOARD_HEIGHT = 800;

/**
 * Locks scene content to a desktop 1280×800 composition, cover-scaled to fill
 * the viewport (no letterboxing / side gaps). Overflow is clipped by the host.
 */
export function MockArtboard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ scale: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const update = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const scale = Math.max(width / MOCK_ARTBOARD_WIDTH, height / MOCK_ARTBOARD_HEIGHT);
      setLayout({
        scale,
        x: (width - MOCK_ARTBOARD_WIDTH * scale) / 2,
        y: (height - MOCK_ARTBOARD_HEIGHT * scale) / 2,
      });
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
          layout == null
            ? { width: MOCK_ARTBOARD_WIDTH, height: MOCK_ARTBOARD_HEIGHT, visibility: "hidden" }
            : {
                width: MOCK_ARTBOARD_WIDTH,
                height: MOCK_ARTBOARD_HEIGHT,
                transform: `translate(${layout.x}px, ${layout.y}px) scale(${layout.scale})`,
              }
        }
      >
        {children}
      </div>
    </div>
  );
}
