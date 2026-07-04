"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

import type { PublicShortlistSubmission } from "@/types/publicShortlist";

import { ShortlistProfileCard } from "./ShortlistProfileCard";

type ShortlistProfileCardStackProps = {
  submissions: PublicShortlistSubmission[];
  onSwipeLeft: (submission: PublicShortlistSubmission) => void;
  onSwipeRight: (submission: PublicShortlistSubmission) => void;
  onPortraitTap?: (submission: PublicShortlistSubmission) => void;
};

export function ShortlistProfileCardStack({
  submissions,
  onSwipeLeft,
  onSwipeRight,
  onPortraitTap,
}: ShortlistProfileCardStackProps) {
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

  if (submissions.length === 0) {
    return null;
  }

  const visible = submissions.slice(0, 3);

  if (reduceMotion) {
    const top = submissions[0];
    return (
      <div className="shortlist-deck-shell" ref={shellRef}>
        <div className="shortlist-deck-card">
          <ShortlistProfileCard
            submission={top}
            isTopCard
            onPortraitTap={onPortraitTap ? () => onPortraitTap(top) : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="shortlist-deck-shell" ref={shellRef}>
      <ul className="shortlist-deck">
        {visible
          .map((submission, index) => ({ submission, index }))
          .reverse()
          .map(({ submission, index }) => (
            <StackedCard
              key={submission.id}
              submission={submission}
              stackIndex={index}
              totalVisible={visible.length}
              minDistance={width * 0.28}
              isTop={index === 0}
              onSwipeLeft={() => onSwipeLeft(submission)}
              onSwipeRight={() => onSwipeRight(submission)}
              onPortraitTap={onPortraitTap ? () => onPortraitTap(submission) : undefined}
            />
          ))}
      </ul>
    </div>
  );
}

function StackedCard({
  submission,
  stackIndex,
  totalVisible,
  minDistance,
  isTop,
  onSwipeLeft,
  onSwipeRight,
  onPortraitTap,
}: {
  submission: PublicShortlistSubmission;
  stackIndex: number;
  totalVisible: number;
  minDistance: number;
  isTop: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onPortraitTap?: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-8, 0, 8]);
  const confirmOpacity = useTransform(x, [0, 80], [0, 1]);
  const rejectOpacity = useTransform(x, [-80, 0], [1, 0]);
  const [isExiting, setIsExiting] = useState(false);

  const yOffset = stackIndex * 10;
  const scale = 1 - stackIndex * 0.05;
  const zIndex = totalVisible - stackIndex;

  const finishSwipe = (direction: "left" | "right") => {
    if (isExiting) return;
    setIsExiting(true);
    const target = direction === "right" ? 420 : -420;
    animate(x, target, {
      type: "spring",
      stiffness: 280,
      damping: 28,
      onComplete: () => {
        if (direction === "right") onSwipeRight();
        else onSwipeLeft();
      },
    });
  };

  const onDragEnd = () => {
    const distance = x.get();
    const speed = x.getVelocity();

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
      style={{
        position: "absolute",
        inset: 0,
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        y: yOffset,
        scale,
        zIndex,
        pointerEvents: isTop ? "auto" : "none",
        listStyle: "none",
      }}
      drag={isTop && !isExiting ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={onDragEnd}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    >
      <div className="shortlist-deck-card" style={{ width: "100%", height: "100%" }}>
        <ShortlistProfileCard submission={submission} isTopCard={isTop} onPortraitTap={onPortraitTap} />
        {isTop ? (
          <>
            <motion.span
              className="shortlist-swipe-indicator shortlist-swipe-indicator--confirm"
              style={{ opacity: confirmOpacity }}
            >
              Confirm
            </motion.span>
            <motion.span
              className="shortlist-swipe-indicator shortlist-swipe-indicator--reject"
              style={{ opacity: rejectOpacity }}
            >
              Reject
            </motion.span>
          </>
        ) : null}
      </div>
    </motion.li>
  );
}
