"use client";

import type { ReactNode } from "react";
import { Children } from "react";
import { motion, useReducedMotion } from "motion/react";

const itemEase = [0.22, 1, 0.36, 1] as const;

type RevealStaggerProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
  amount?: number;
  distance?: number;
};

export function RevealStagger({
  children,
  className,
  stagger = 0.09,
  amount = 0.22,
  distance = 22,
}: RevealStaggerProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren: 0.04 },
        },
      }}
    >
      {Children.toArray(children).map((child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: distance, scale: 0.985 },
            visible: {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { duration: 0.62, ease: itemEase },
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
