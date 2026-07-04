"use client";

import { useCallback, useRef, useState } from "react";

import type { TalentRow } from "@/lib/talent-navigator/types";

export type NavigatorDirection = "row-up" | "row-down" | "col-left" | "col-right";

export function useNavigatorSlide(rows: TalentRow[], stepX: number, stepY: number) {
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [activeColByRowId, setActiveColByRowId] = useState<Record<string, number>>({});
  const [trackOffsetY, setTrackOffsetY] = useState(0);
  const [activeRowOffsetX, setActiveRowOffsetX] = useState(0);
  const [slideInstant, setSlideInstant] = useState(false);
  const isSlidingRef = useRef(false);

  const clampedRowIndex = rows.length ? Math.min(activeRowIndex, rows.length - 1) : 0;
  const currentRow = rows[clampedRowIndex];
  const clampedColIndex = currentRow?.talent.length
    ? Math.min(activeColByRowId[currentRow.id] ?? 0, currentRow.talent.length - 1)
    : 0;

  const resetNavigation = useCallback(() => {
    setActiveRowIndex(0);
    setActiveColByRowId({});
    setTrackOffsetY(0);
    setActiveRowOffsetX(0);
  }, []);

  const moveCol = useCallback(
    (delta: number) => {
      const row = rows[clampedRowIndex];
      if (!row?.talent.length) return;
      setActiveColByRowId((current) => {
        const base = Math.min(current[row.id] ?? 0, row.talent.length - 1);
        return {
          ...current,
          [row.id]: (base + delta + row.talent.length) % row.talent.length,
        };
      });
    },
    [rows, clampedRowIndex],
  );

  const moveRow = useCallback(
    (delta: number) => {
      if (!rows.length) return;
      setActiveRowIndex((index) => (index + delta + rows.length) % rows.length);
    },
    [rows.length],
  );

  const runSlide = useCallback((applyStartOffset: () => void, resetOffset: () => void) => {
    setSlideInstant(true);
    applyStartOffset();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSlideInstant(false);
        resetOffset();
      });
    });
  }, []);

  const navigate = useCallback(
    (direction: NavigatorDirection) => {
      if (isSlidingRef.current) return;
      isSlidingRef.current = true;

      if (direction === "col-right") {
        moveCol(1);
        runSlide(
          () => setActiveRowOffsetX(stepX),
          () => setActiveRowOffsetX(0),
        );
        return;
      }
      if (direction === "col-left") {
        moveCol(-1);
        runSlide(
          () => setActiveRowOffsetX(-stepX),
          () => setActiveRowOffsetX(0),
        );
        return;
      }
      if (direction === "row-down") {
        moveRow(1);
        runSlide(
          () => setTrackOffsetY(stepY),
          () => setTrackOffsetY(0),
        );
        return;
      }
      if (direction === "row-up") {
        moveRow(-1);
        runSlide(
          () => setTrackOffsetY(-stepY),
          () => setTrackOffsetY(0),
        );
      }
    },
    [moveCol, moveRow, runSlide, stepX, stepY],
  );

  const handleSlideComplete = useCallback(() => {
    isSlidingRef.current = false;
  }, []);

  const focusCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (isSlidingRef.current) return;
      const row = rows[rowIndex];
      if (!row) return;
      setActiveRowIndex(rowIndex);
      setActiveColByRowId((current) => ({ ...current, [row.id]: colIndex }));
    },
    [rows],
  );

  return {
    activeRowIndex: clampedRowIndex,
    activeColIndex: clampedColIndex,
    activeColByRowId,
    trackOffsetY,
    activeRowOffsetX,
    slideInstant,
    navigate,
    handleSlideComplete,
    focusCell,
    resetNavigation,
    isSlidingRef,
  };
}
