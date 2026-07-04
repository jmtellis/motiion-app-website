"use client";

import { useMemo } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import type { Talent, TalentRow } from "@/lib/talent-navigator/types";

import { TalentCard } from "./TalentCard";

type GridMetrics = {
  cellW: number;
  cellH: number;
  gap: number;
  stepX: number;
  stepY: number;
  colRadius: number;
  rowRadius: number;
};

const DEFAULT_METRICS: GridMetrics = {
  cellW: 188,
  cellH: 250,
  gap: 12,
  stepX: 200,
  stepY: 262,
  colRadius: 4,
  rowRadius: 3,
};

const COMPACT_METRICS: GridMetrics = {
  cellW: 84,
  cellH: 112,
  gap: 8,
  stepX: 92,
  stepY: 120,
  colRadius: 2,
  rowRadius: 1,
};

const PREVIEW_CELL = {
  cellW: 148,
  cellH: 198,
  gap: 10,
  stepX: 158,
  stepY: 208,
} as const;

const PREVIEW_METRICS: GridMetrics = {
  ...PREVIEW_CELL,
  colRadius: 4,
  rowRadius: 2,
};

export function getPreviewGridMetrics(viewportWidth: number, viewportHeight: number): GridMetrics {
  const { cellW, cellH, gap, stepX, stepY } = PREVIEW_CELL;
  const colRadius = Math.min(4, Math.max(3, Math.ceil(viewportWidth / stepX / 2)));
  const rowRadius = Math.min(2, Math.max(1, Math.ceil(viewportHeight / stepY / 2)));

  return { cellW, cellH, gap, stepX, stepY, colRadius, rowRadius };
}

export function getNavigatorGridMetrics(
  compact = false,
  preview = false,
  viewport?: { width: number; height: number },
): GridMetrics {
  if (preview && viewport?.width && viewport?.height) {
    return getPreviewGridMetrics(viewport.width, viewport.height);
  }
  if (preview) return PREVIEW_METRICS;
  return compact ? COMPACT_METRICS : DEFAULT_METRICS;
}

export const NAVIGATOR_STEP_X = DEFAULT_METRICS.stepX;
export const NAVIGATOR_STEP_Y = DEFAULT_METRICS.stepY;

type GridCell = {
  rowOffset: number;
  colOffset: number;
  talent: Talent;
  rowIndex: number;
  colIndex: number;
  distance: number;
};

type TalentNavigatorGridProps = {
  rows: TalentRow[];
  activeRowIndex: number;
  activeColByRowId: Record<string, number>;
  trackOffsetY: number;
  activeRowOffsetX: number;
  slideInstant?: boolean;
  compact?: boolean;
  preview?: boolean;
  previewViewport?: { width: number; height: number };
  showControls?: boolean;
  onSlideComplete?: () => void;
  onFocusCell: (rowIndex: number, colIndex: number) => void;
  onOpenProfile: (talent: Talent) => void;
  onNavigate?: (direction: "row-up" | "row-down" | "col-left" | "col-right") => void;
};

function wrapIndex(index: number, length: number) {
  if (length === 0) return 0;
  return ((index % length) + length) % length;
}

function maxRadius(requested: number, length: number) {
  if (length <= 1) return 0;
  return Math.min(requested, Math.floor((length - 1) / 2));
}

function getRowColIndex(row: TalentRow, activeColByRowId: Record<string, number>) {
  if (!row.talent.length) return 0;
  const saved = activeColByRowId[row.id] ?? 0;
  return Math.min(saved, row.talent.length - 1);
}

function buildVisibleCells(
  rows: TalentRow[],
  activeRowIndex: number,
  activeColByRowId: Record<string, number>,
  metrics: GridMetrics,
): GridCell[] {
  const cells: GridCell[] = [];
  const rowRadius = maxRadius(metrics.rowRadius, rows.length);

  for (let rowOffset = -rowRadius; rowOffset <= rowRadius; rowOffset += 1) {
    const rowIndex = wrapIndex(activeRowIndex + rowOffset, rows.length);
    const row = rows[rowIndex];
    if (!row?.talent.length) continue;

    const rowColIndex = getRowColIndex(row, activeColByRowId);
    const colRadius = maxRadius(metrics.colRadius, row.talent.length);

    for (let colOffset = -colRadius; colOffset <= colRadius; colOffset += 1) {
      const colIndex = wrapIndex(rowColIndex + colOffset, row.talent.length);
      const talent = row.talent[colIndex];
      if (!talent) continue;

      const distance = Math.max(Math.abs(rowOffset), Math.abs(colOffset));
      cells.push({ rowOffset, colOffset, talent, rowIndex, colIndex, distance });
    }
  }

  return cells;
}

export function TalentNavigatorGrid({
  rows,
  activeRowIndex,
  activeColByRowId,
  trackOffsetY,
  activeRowOffsetX,
  slideInstant = false,
  compact = false,
  preview = false,
  previewViewport,
  showControls = true,
  onSlideComplete,
  onFocusCell,
  onOpenProfile,
  onNavigate,
}: TalentNavigatorGridProps) {
  const metrics = useMemo(
    () => getNavigatorGridMetrics(compact, preview, previewViewport),
    [compact, preview, previewViewport],
  );
  const cells = useMemo(
    () => buildVisibleCells(rows, activeRowIndex, activeColByRowId, metrics),
    [rows, activeRowIndex, activeColByRowId, metrics],
  );

  function handleSlideTransitionEnd(event: React.TransitionEvent<HTMLElement>) {
    if (event.propertyName !== "transform" || slideInstant) return;
    if (trackOffsetY === 0 && activeRowOffsetX === 0) {
      onSlideComplete?.();
    }
  }

  return (
    <div
      className={`talent-navigator__grid-shell${compact ? " talent-navigator__grid-shell--compact" : ""}${preview ? " talent-navigator__grid-shell--preview" : ""}`}
      role="grid"
      aria-rowcount={rows.length}
      aria-colcount={rows[activeRowIndex]?.talent.length ?? 0}
      aria-label="Talent navigator grid"
    >
      <div className="talent-navigator__grid-viewport">
        <div className="talent-navigator__grid-ambient" aria-hidden />

        {showControls && onNavigate ? (
          <>
            <button
              type="button"
              className="talent-navigator__nav-arrow talent-navigator__nav-arrow--left"
              onClick={() => onNavigate("col-left")}
              aria-label="Previous talent"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className="talent-navigator__nav-arrow talent-navigator__nav-arrow--right"
              onClick={() => onNavigate("col-right")}
              aria-label="Next talent"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              className="talent-navigator__nav-arrow talent-navigator__nav-arrow--down"
              onClick={() => onNavigate("row-down")}
              aria-label="Next category row"
            >
              <ChevronDown className="size-4" />
            </button>
          </>
        ) : null}

        <div
          className={`talent-navigator__grid-track${slideInstant ? " talent-navigator__grid-track--instant" : ""}`}
          style={{ transform: `translate(0px, ${trackOffsetY}px)` }}
          onTransitionEnd={handleSlideTransitionEnd}
        >
          {cells.map((cell) => {
            const isActive = cell.distance === 0;
            const isActiveRow = cell.rowOffset === 0;
            const x =
              cell.colOffset * metrics.stepX -
              metrics.cellW / 2 +
              (isActiveRow ? activeRowOffsetX : 0);
            const y = cell.rowOffset * metrics.stepY - metrics.cellH / 2;

            return (
              <div
                key={`${cell.rowIndex}-${cell.colIndex}-${cell.rowOffset}-${cell.colOffset}`}
                className={`talent-navigator__card-slot${isActive ? " talent-navigator__card-slot--active" : ""}${isActiveRow ? " talent-navigator__card-slot--active-row" : ""}${slideInstant ? " talent-navigator__card-slot--instant" : ""}`}
                style={{
                  width: metrics.cellW,
                  height: metrics.cellH,
                  transform: `translate(${x}px, ${y}px)`,
                }}
                onTransitionEnd={isActive ? handleSlideTransitionEnd : undefined}
              >
                <TalentCard
                  talent={cell.talent}
                  active={isActive}
                  distance={cell.distance}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => onFocusCell(cell.rowIndex, cell.colIndex)}
                  onDoubleClick={() => onOpenProfile(cell.talent)}
                  ariaLabel={`${cell.talent.name}, row ${cell.rowIndex + 1}, column ${cell.colIndex + 1}${isActive ? ", active" : ""}`}
                />
              </div>
            );
          })}
        </div>

        <div className="talent-navigator__grid-vignette" aria-hidden />
        <div className="talent-navigator__grid-edge-fade talent-navigator__grid-edge-fade--left" aria-hidden />
        <div className="talent-navigator__grid-edge-fade talent-navigator__grid-edge-fade--right" aria-hidden />
        <div className="talent-navigator__grid-edge-fade talent-navigator__grid-edge-fade--top" aria-hidden />
        <div className="talent-navigator__grid-edge-fade talent-navigator__grid-edge-fade--bottom" aria-hidden />
      </div>
    </div>
  );
}
