"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  castingStatusLabel,
  CASTING_STATUS_TONE_CLASSES,
  castingStatusTone,
} from "@/lib/talent-buyers/casting/casting-statuses";
import type { CastingCandidate } from "@/lib/talent-buyers/casting/casting-types";

type CastingFocusCandidateStackProps = {
  candidates: CastingCandidate[];
  focusIndex: number;
  onFocusIndexChange: (index: number) => void;
  onOpenCandidate?: (candidate: CastingCandidate) => void;
};

export function CastingFocusCandidateStack({
  candidates,
  focusIndex,
  onFocusIndexChange,
  onOpenCandidate,
}: CastingFocusCandidateStackProps) {
  const reduceMotion = useReducedMotion();
  const shellRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  useEffect(() => {
    const element = shellRef.current;
    if (!element) return;
    const update = () => setWidth(element.offsetWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const stacked = useMemo(() => {
    if (!candidates.length) return [];
    const items: { candidate: CastingCandidate; stackIndex: number }[] = [];
    for (let offset = 0; offset < Math.min(3, candidates.length); offset += 1) {
      const absoluteIndex = (focusIndex + offset) % candidates.length;
      items.push({
        candidate: candidates[absoluteIndex],
        stackIndex: offset,
      });
    }
    return items;
  }, [candidates, focusIndex]);

  if (!candidates.length) return null;

  if (reduceMotion) {
    const current = candidates[focusIndex] ?? candidates[0];
    return (
      <div className="casting-focus-stack" ref={shellRef}>
        <FocusCandidateCard
          candidate={current}
          onOpen={onOpenCandidate ? () => onOpenCandidate(current) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="casting-focus-stack" ref={shellRef}>
      <ul className="casting-focus-stack__deck" aria-label="Focus review candidates">
        {stacked
          .slice()
          .reverse()
          .map(({ candidate, stackIndex }) => (
            <FocusStackedCard
              key={`${candidate.id}-${focusIndex}-${stackIndex}`}
              candidate={candidate}
              stackIndex={stackIndex}
              totalVisible={stacked.length}
              minDistance={width * 0.28}
              isTop={stackIndex === 0}
              canGoPrevious={candidates.length > 1}
              canGoNext={candidates.length > 1}
              onPrevious={() =>
                onFocusIndexChange((focusIndex - 1 + candidates.length) % candidates.length)
              }
              onNext={() => onFocusIndexChange((focusIndex + 1) % candidates.length)}
              onOpen={
                stackIndex === 0 && onOpenCandidate
                  ? () => onOpenCandidate(candidate)
                  : undefined
              }
            />
          ))}
      </ul>
      <p className="casting-focus-stack__hint">Swipe to browse · Shortlist below</p>
      <p className="casting-focus-stack__count">
        {focusIndex + 1} of {candidates.length}
      </p>
    </div>
  );
}

function FocusStackedCard({
  candidate,
  stackIndex,
  totalVisible,
  minDistance,
  isTop,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
  onOpen,
}: {
  candidate: CastingCandidate;
  stackIndex: number;
  totalVisible: number;
  minDistance: number;
  isTop: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onOpen?: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-10, 0, 10]);
  const nextHint = useTransform(x, [0, 90], [0, 1]);
  const prevHint = useTransform(x, [-90, 0], [1, 0]);
  const [isExiting, setIsExiting] = useState(false);

  const yOffset = stackIndex * 12;
  const scale = 1 - stackIndex * 0.045;
  const zIndex = totalVisible - stackIndex;

  const finishSwipe = (direction: "left" | "right") => {
    if (isExiting) return;
    if (direction === "right" && !canGoNext) {
      animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
      return;
    }
    if (direction === "left" && !canGoPrevious) {
      animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
      return;
    }

    setIsExiting(true);
    const target = direction === "right" ? 480 : -480;
    animate(x, target, {
      type: "spring",
      stiffness: 280,
      damping: 28,
      onComplete: () => {
        if (direction === "right") onNext();
        else onPrevious();
      },
    });
  };

  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const distance = info.offset.x;
    const speed = info.velocity.x;

    if (distance > minDistance || speed > 450) {
      finishSwipe("right");
      return;
    }
    if (distance < -minDistance || speed < -450) {
      finishSwipe("left");
      return;
    }

    animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
  };

  return (
    <motion.li
      className="casting-focus-stack__item"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        y: yOffset,
        scale,
        zIndex,
        pointerEvents: isTop ? "auto" : "none",
      }}
      drag={isTop && !isExiting ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.92}
      onDragEnd={onDragEnd}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    >
      <FocusCandidateCard candidate={candidate} onOpen={onOpen} />
      {isTop ? (
        <>
          <motion.span className="casting-focus-stack__swipe-hint casting-focus-stack__swipe-hint--next" style={{ opacity: nextHint }}>
            Next
          </motion.span>
          <motion.span className="casting-focus-stack__swipe-hint casting-focus-stack__swipe-hint--prev" style={{ opacity: prevHint }}>
            Previous
          </motion.span>
        </>
      ) : null}
    </motion.li>
  );
}

function FocusCandidateCard({
  candidate,
  onOpen,
}: {
  candidate: CastingCandidate;
  onOpen?: () => void;
}) {
  return (
    <article className="casting-focus-stack__card">
      <button
        type="button"
        className="casting-focus-stack__card-button"
        onClick={onOpen}
        disabled={!onOpen}
      >
        {candidate.headshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={candidate.headshotUrl} alt="" className="casting-focus-stack__photo" draggable={false} />
        ) : (
          <div className="casting-focus-stack__photo casting-focus-stack__photo--empty" />
        )}
        <div className="casting-focus-stack__card-body">
          <strong>{candidate.displayName}</strong>
          <span className={`casting-status-pill ${CASTING_STATUS_TONE_CLASSES[castingStatusTone(candidate.status)]}`}>
            {castingStatusLabel(candidate.status)}
          </span>
          {candidate.agency?.trim() ? (
            <span className="casting-focus-stack__meta">{candidate.agency.trim()}</span>
          ) : null}
        </div>
      </button>
    </article>
  );
}
