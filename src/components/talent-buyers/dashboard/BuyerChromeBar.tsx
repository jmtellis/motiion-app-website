import Link from "next/link";
import type { ReactNode } from "react";

import { MotiionBrandMark } from "@/components/brand/MotiionBrandMark";
import { BUYER_HOME_PATH } from "@/lib/talent-buyers/dashboard-data";

import "./buyer-chrome.css";

export function BuyerChromeLogo({ height = 16 }: { height?: number }) {
  return (
    <Link href={BUYER_HOME_PATH} className="buyer-chrome-bar__logo" aria-label="Motiion home">
      <MotiionBrandMark inverted height={height} />
    </Link>
  );
}

export function BuyerChromeBar({
  position = "header",
  start,
  center,
  end,
  className = "",
}: {
  position?: "header" | "footer";
  start?: ReactNode;
  center?: ReactNode;
  end?: ReactNode;
  className?: string;
}) {
  const Tag = position === "header" ? "header" : "footer";

  return (
    <Tag className={`buyer-chrome-bar buyer-chrome-bar--${position} ${className}`.trim()}>
      <div className="buyer-chrome-bar__start">{start}</div>
      <div className="buyer-chrome-bar__center">
        {center !== undefined ? center : <BuyerChromeLogo />}
      </div>
      <div className="buyer-chrome-bar__end">{end}</div>
    </Tag>
  );
}
