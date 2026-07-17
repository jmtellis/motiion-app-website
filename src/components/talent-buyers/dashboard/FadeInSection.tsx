"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type FadeInSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article" | "li";
};

export function FadeInSection({
  children,
  className = "",
  delay = 0,
  as = "div",
}: FadeInSectionProps) {
  const reducedMotion = useReducedMotion();
  const Component = motion.create(as);

  return (
    <Component
      className={className}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{
        duration: reducedMotion ? 0.12 : 0.48,
        delay: reducedMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </Component>
  );
}

type StaggerListProps = {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  stagger?: number;
};

export function StaggerList({
  children,
  className = "",
  itemClassName = "",
  stagger = 0.06,
}: StaggerListProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <FadeInSection key={index} className={itemClassName} delay={index * stagger}>
          {child}
        </FadeInSection>
      ))}
    </div>
  );
}
