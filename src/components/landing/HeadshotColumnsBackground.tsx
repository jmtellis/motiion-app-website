"use client";

import { motion, useReducedMotion } from "motion/react";

import { MARKETING_DARK } from "@/lib/marketing/dark-theme";
import { portraitWallImages } from "@/lib/mock-data";

const HERO_TINT_LIGHT = {
  sky: "rgba(186, 220, 245, 0.12)",
  cyan: "rgba(0, 168, 200, 0.05)",
  brand: "rgba(0, 204, 183, 0.03)",
  paper: "rgba(252, 252, 251, 0.65)",
} as const;

const TILES_PER_COLUMN = 4;

/**
 * Assign images per column so the same URL does not appear in horizontally adjacent
 * columns at the same tile row (when the pool allows).
 */
function assignHeadshotColumns(
  sourceImages: string[],
  columnCount: number,
  tilesPerColumn: number,
): string[][] {
  const pool = [...new Set(sourceImages.filter(Boolean))];
  if (pool.length === 0) {
    return Array.from({ length: columnCount }, () => []);
  }

  const columns: string[][] = Array.from({ length: columnCount }, () => []);

  for (let tile = 0; tile < tilesPerColumn; tile++) {
    for (let col = 0; col < columnCount; col++) {
      const leftNeighbor = col > 0 ? columns[col - 1][tile] : undefined;
      const usedInColumn = new Set(columns[col]);

      let chosen: string | undefined;
      for (let attempt = 0; attempt < pool.length; attempt++) {
        const candidate = pool[(col * 5 + tile * 11 + attempt) % pool.length];
        if (candidate !== leftNeighbor && !usedInColumn.has(candidate)) {
          chosen = candidate;
          break;
        }
      }

      if (!chosen) {
        chosen =
          pool.find((url) => url !== leftNeighbor && !usedInColumn.has(url)) ??
          pool.find((url) => url !== leftNeighbor) ??
          pool[(col + tile) % pool.length];
      }

      columns[col].push(chosen);
    }
  }

  return columns;
}

type ColumnConfig = {
  offset: number;
  direction: "up" | "down";
  duration: number;
};

/** Original six-column wall — column width on large screens is based on fitting six across the viewport. */
const coreColumns: ColumnConfig[] = [
  { offset: 0, direction: "up", duration: 34 },
  { offset: 2, direction: "down", duration: 42 },
  { offset: 4, direction: "up", duration: 30 },
  { offset: 6, direction: "down", duration: 46 },
  { offset: 1, direction: "up", duration: 38 },
  { offset: 3, direction: "down", duration: 40 },
];

/** One extra column per side on desktop; clipped at viewport edge, same tile size as core. */
const desktopColumns: ColumnConfig[] = [
  { offset: 5, direction: "down", duration: 43 },
  ...coreColumns,
  { offset: 7, direction: "up", duration: 37 },
];

/** Matches `lg:grid-cols-6` + `gap-2` + `px-12` so tiles stay the same size when we add side columns. */
const DESKTOP_COLUMN_WIDTH = "w-[calc((100vw-6rem-5*0.5rem)/6)] shrink-0";

function HeadshotColumn({
  images,
  direction,
  duration,
  overlay,
}: {
  images: string[];
  direction: "up" | "down";
  duration: number;
  overlay: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const translate = direction === "up" ? ["0%", "-50%"] : ["-50%", "0%"];

  if (reduceMotion) {
    return (
      <div className="flex flex-col gap-2">
        {images.slice(0, TILES_PER_COLUMN).map((src, index) => (
          <HeadshotTile key={`${src}-${index}`} src={src} overlay={overlay} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-2"
      initial={{ y: translate[0] }}
      animate={{ y: translate[1] }}
      transition={{ duration, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
    >
      {[...images, ...images].map((src, index) => (
        <HeadshotTile key={`${src}-${index}`} src={src} overlay={overlay} />
      ))}
    </motion.div>
  );
}

function HeadshotTile({ src, overlay }: { src: string; overlay: boolean }) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden" style={{ borderRadius: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className={`h-full w-full object-cover object-center ${overlay ? "scale-[1.12] opacity-88" : "scale-[1.12] opacity-92 saturate-[0.98]"}`}
        style={{ borderRadius: 0 }}
      />
      {overlay ? (
        <div
          className="absolute inset-0 bg-[linear-gradient(145deg,rgba(0,0,0,0.12)_0%,transparent_50%,rgba(0,0,0,0.2)_100%)]"
          style={{ borderRadius: 0 }}
        />
      ) : (
        <div
          className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.12)_0%,transparent_48%)]"
          style={{ borderRadius: 0 }}
        />
      )}
    </div>
  );
}

function renderColumn(
  column: ColumnConfig,
  columnImages: string[],
  index: number,
  overlay: boolean,
  widthClass?: string,
) {
  return (
    <div key={`${column.offset}-${index}`} className={widthClass}>
      <HeadshotColumn
        images={columnImages}
        direction={column.direction}
        duration={column.duration}
        overlay={overlay}
      />
    </div>
  );
}

export function HeadshotColumnsBackground({
  className,
  images = portraitWallImages,
  variant = "light",
}: {
  className?: string;
  images?: string[];
  /** `overlay` = scrolling wall on top of studio plate; fades into dark. */
  variant?: "light" | "overlay";
}) {
  const pool = [...new Set((images.length >= 8 ? images : portraitWallImages).filter(Boolean))];
  const sourceImages = pool.length ? pool : portraitWallImages;
  const coreColumnImages = assignHeadshotColumns(sourceImages, coreColumns.length, TILES_PER_COLUMN);
  const desktopColumnImages = assignHeadshotColumns(sourceImages, desktopColumns.length, TILES_PER_COLUMN);
  const overlay = variant === "overlay";
  const opacity = overlay ? "opacity-82" : "opacity-90";

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${overlay ? "bg-transparent" : "bg-[#f6fafb]"} ${className ?? ""}`}
      aria-hidden
    >
      {/* Mobile / tablet: original 6-column grid density */}
      <div
        className={`absolute inset-0 grid grid-cols-2 gap-x-2 gap-y-2 px-4 sm:grid-cols-3 lg:hidden lg:px-12 ${opacity}`}
      >
        {coreColumns.map((column, index) =>
          renderColumn(column, coreColumnImages[index] ?? [], index, overlay),
        )}
      </div>

      {/* Desktop: same tile size as 6-across, plus one clipped column on each side */}
      <div
        className={`absolute inset-0 hidden items-start justify-center lg:flex ${opacity}`}
      >
        <div className="flex gap-2 px-12">
          {desktopColumns.map((column, index) =>
            renderColumn(column, desktopColumnImages[index] ?? [], index, overlay, DESKTOP_COLUMN_WIDTH),
          )}
        </div>
      </div>

      {overlay ? (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 110% 78% at 50% 46%, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.45) 42%, transparent 78%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.55) 28%, rgba(0, 0, 0, 0.82) 58%, ${MARKETING_DARK.bg} 100%)`,
            }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(165deg, ${HERO_TINT_LIGHT.sky} 0%, transparent 36%), radial-gradient(ellipse 90% 55% at 50% 42%, ${HERO_TINT_LIGHT.cyan} 0%, transparent 68%), radial-gradient(ellipse 130% 90% at 50% 100%, ${HERO_TINT_LIGHT.brand} 0%, transparent 58%), radial-gradient(ellipse 100% 70% at 50% 40%, ${HERO_TINT_LIGHT.paper} 0%, transparent 75%)`,
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,transparent_52%,rgba(248,251,252,0.38)_85%,var(--paper)_100%)]" />
        </>
      )}
    </div>
  );
}
