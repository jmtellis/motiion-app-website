"use client";

import { useEffect, useState } from "react";

export function DemoTypewriter({
  text,
  active,
  reduceMotion = false,
  charMs = 38,
  className,
}: {
  text: string;
  active: boolean;
  reduceMotion?: boolean;
  charMs?: number;
  className?: string;
}) {
  const [count, setCount] = useState(0);
  const [previousInput, setPreviousInput] = useState({ active, text });
  if (previousInput.active !== active || previousInput.text !== text) {
    setPreviousInput({ active, text }); setCount(0);
  }
  const value = reduceMotion ? text : active ? text.slice(0, count) : "";
  useEffect(() => {
    if (reduceMotion || !active) return;
    let index = 0;
    const id = window.setInterval(() => {
      index += 1; setCount(index);
      if (index >= text.length) window.clearInterval(id);
    }, charMs);
    return () => window.clearInterval(id);
  }, [active, text, charMs, reduceMotion]);

  return (
    <span className={className}>
      {value}
      {active && value.length < text.length && !reduceMotion ? (
        <span className="marketing-demo-caret" aria-hidden />
      ) : null}
    </span>
  );
}
