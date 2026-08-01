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
  const [value, setValue] = useState(reduceMotion ? text : "");

  useEffect(() => {
    if (reduceMotion) {
      setValue(text);
      return;
    }

    if (!active) {
      setValue("");
      return;
    }

    setValue("");
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setValue(text.slice(0, index));
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
