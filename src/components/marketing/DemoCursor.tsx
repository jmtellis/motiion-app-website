"use client";

import { motion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

export function DemoCursor({
  x,
  y,
  visible = true,
  pressing = false,
}: {
  x: number;
  y: number;
  visible?: boolean;
  pressing?: boolean;
}) {
  return (
    <motion.div
      className="marketing-demo-cursor"
      aria-hidden
      initial={false}
      animate={{
        x,
        y,
        opacity: visible ? 1 : 0,
        scale: pressing ? 0.88 : 1,
      }}
      transition={{
        x: { duration: 0.55, ease: EASE },
        y: { duration: 0.55, ease: EASE },
        opacity: { duration: 0.25, ease: EASE },
        scale: { duration: 0.15, ease: EASE },
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M5.5 3.5L18.5 12.2L12.2 13.6L9.8 20.5L5.5 3.5Z"
          fill="#fafafa"
          stroke="#111"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
}
