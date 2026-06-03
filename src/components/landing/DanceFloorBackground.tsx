"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import { useScrollProgressMotion } from "@/lib/motion/scroll-motion";

type DanceFloorBackgroundProps = {
  className?: string;
};

/** Subtle dance-floor texture + tape markings with multi-speed parallax. */
export function DanceFloorBackground({ className }: DanceFloorBackgroundProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const motionProgress = useScrollProgressMotion(scrollYProgress);

  const floorY = useTransform(motionProgress, [0, 1], ["0%", "8%"]);
  const tapeY = useTransform(motionProgress, [0, 1], ["0%", "18%"]);
  const marksY = useTransform(motionProgress, [0, 1], ["0%", "28%"]);
  const opacity = useTransform(motionProgress, [0, 0.12, 0.25], [0, 0.25, 0.42]);

  if (reduceMotion) {
    return (
      <div
        ref={ref}
        className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-[0.28] ${className ?? ""}`}
        aria-hidden
      >
        <FloorTexture />
        <TapeGrid />
        <StudioMarkings />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className ?? ""}`}
      aria-hidden
    >
        <motion.div className="absolute inset-0" style={{ opacity }}>
          <motion.div className="absolute inset-[-5%]" style={{ y: floorY }}>
            <FloorTexture />
          </motion.div>
          <motion.div className="absolute inset-[-8%]" style={{ y: tapeY }}>
            <TapeGrid />
          </motion.div>
          <motion.div className="absolute inset-[-10%]" style={{ y: marksY }}>
          <StudioMarkings />
        </motion.div>
      </motion.div>
    </div>
  );
}

function FloorTexture() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `
          repeating-linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.02) 0px,
            rgba(255, 255, 255, 0.02) 1px,
            transparent 1px,
            transparent 48px
          ),
          repeating-linear-gradient(
            0deg,
            rgba(255, 255, 255, 0.015) 0px,
            rgba(255, 255, 255, 0.015) 1px,
            transparent 1px,
            transparent 64px
          ),
          linear-gradient(180deg, #000000 0%, #000000 50%, #000000 100%)
        `,
      }}
    />
  );
}

function TapeGrid() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-40" preserveAspectRatio="none" viewBox="0 0 1440 900">
      <defs>
        <pattern id="tape-h" width="120" height="120" patternUnits="userSpaceOnUse">
          <path d="M0 60 H120" stroke="rgba(0, 204, 183, 0.08)" strokeWidth="1" strokeDasharray="6 8" />
        </pattern>
        <pattern id="tape-v" width="120" height="120" patternUnits="userSpaceOnUse">
          <path d="M60 0 V120" stroke="rgba(0, 204, 183, 0.06)" strokeWidth="1" strokeDasharray="4 10" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#tape-h)" />
      <rect width="100%" height="100%" fill="url(#tape-v)" />
    </svg>
  );
}

function StudioMarkings() {
  const boxes = [
    { x: 180, y: 220, w: 140, h: 140, label: "STAND" },
    { x: 520, y: 380, w: 120, h: 120, label: "MARK" },
    { x: 980, y: 260, w: 160, h: 100, label: "8 COUNT" },
    { x: 720, y: 580, w: 100, h: 100, label: "X" },
  ];

  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900">
      {boxes.map((box) => (
        <g key={box.label} opacity={0.35}>
          <rect
            x={box.x}
            y={box.y}
            width={box.w}
            height={box.h}
            fill="none"
            stroke="rgba(0, 204, 183, 0.2)"
            strokeWidth="1"
            strokeDasharray="8 6"
          />
          <path
            d={`M${box.x} ${box.y} L${box.x + 16} ${box.y} L${box.x} ${box.y + 16} M${box.x + box.w} ${box.y + box.h} L${box.x + box.w - 16} ${box.y + box.h} L${box.x + box.w} ${box.y + box.h - 16}`}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1"
            fill="none"
          />
          <text
            x={box.x + box.w / 2}
            y={box.y + box.h / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255, 255, 255, 0.12)"
            fontSize="11"
            fontFamily="system-ui, sans-serif"
            letterSpacing="0.2em"
          >
            {box.label}
          </text>
        </g>
      ))}
      {/* Diagonal tape strips */}
      <line x1="-100" y1="650" x2="1540" y2="200" stroke="rgba(0, 204, 183, 0.06)" strokeWidth="2" />
      <line x1="-80" y1="720" x2="1520" y2="280" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" strokeDasharray="12 16" />
    </svg>
  );
}
