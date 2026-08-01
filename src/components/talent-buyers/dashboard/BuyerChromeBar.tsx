import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

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
  progressPercent,
}: {
  position?: "header" | "footer";
  start?: ReactNode;
  center?: ReactNode;
  end?: ReactNode;
  className?: string;
  /** 0–100; when set, replaces the bottom border with a progress track. */
  progressPercent?: number | null;
}) {
  const Tag = position === "header" ? "header" : "footer";
  const showProgress =
    typeof progressPercent === "number" && Number.isFinite(progressPercent);
  const clampedProgress = showProgress
    ? Math.min(100, Math.max(0, progressPercent))
    : 0;

  return (
    <Tag
      className={`buyer-chrome-bar buyer-chrome-bar--${position}${
        showProgress ? " buyer-chrome-bar--with-progress" : ""
      } ${className}`.trim()}
      style={
        showProgress
          ? ({ ["--buyer-chrome-progress"]: `${clampedProgress}%` } as CSSProperties)
          : undefined
      }
    >
      <div className="buyer-chrome-bar__start">{start}</div>
      <div className="buyer-chrome-bar__center">
        {center !== undefined ? center : <BuyerChromeLogo />}
      </div>
      <div className="buyer-chrome-bar__end">{end}</div>
      {showProgress ? (
        <div
          className="buyer-chrome-bar__progress"
          role="progressbar"
          aria-valuenow={Math.round(clampedProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Page progress"
        >
          <span className="buyer-chrome-bar__progress-bar" />
        </div>
      ) : null}
    </Tag>
  );
}
