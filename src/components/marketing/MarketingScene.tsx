"use client";

import type { ReactNode } from "react";

export type MarketingSceneProps = {
  play: boolean;
  reduceMotion?: boolean;
  playKey: number;
};

export function MarketingScene({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-scene">
      <div className="marketing-scene__viewport">{children}</div>
    </div>
  );
}
