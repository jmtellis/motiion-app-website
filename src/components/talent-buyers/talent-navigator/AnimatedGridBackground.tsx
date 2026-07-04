"use client";

import { motion, useReducedMotion } from "motion/react";

const NODES = [
  { left: "12%", top: "18%" },
  { left: "34%", top: "42%" },
  { left: "58%", top: "24%" },
  { left: "76%", top: "56%" },
  { left: "22%", top: "72%" },
  { left: "88%", top: "32%" },
];

export function AnimatedGridBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="talent-navigator-grid-bg" aria-hidden>
      <div className="talent-navigator-grid-bg__ambient" />
      {!reduceMotion ? (
        <motion.div
          className="talent-navigator-grid-bg__lines"
          animate={{ backgroundPosition: ["0px 0px", "48px 48px"] }}
          transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        />
      ) : (
        <div className="talent-navigator-grid-bg__lines" />
      )}
      <div className="talent-navigator-grid-bg__nodes">
        {NODES.map((node, index) =>
          reduceMotion ? (
            <span
              key={index}
              className="talent-navigator-grid-bg__node"
              style={{ left: node.left, top: node.top }}
            />
          ) : (
            <motion.span
              key={index}
              className="talent-navigator-grid-bg__node"
              style={{ left: node.left, top: node.top }}
              animate={{ opacity: [0.25, 0.85, 0.25], scale: [0.85, 1.15, 0.85] }}
              transition={{ duration: 3.2 + index * 0.4, repeat: Infinity, ease: "easeInOut" }}
            />
          ),
        )}
      </div>
    </div>
  );
}
