"use client";

import { useEffect, useRef, useState } from "react";

export type SceneStep = {
  at: number;
  set: string;
};

function beatAtElapsed(steps: SceneStep[], elapsed: number) {
  let current = steps[0]?.set ?? "idle";
  for (const step of steps) {
    if (step.at <= elapsed) current = step.set;
  }
  return current;
}

/**
 * Advances through named timeline beats.
 * Pausing freezes the current beat; changing `restartKey` restarts from the top.
 */
export function useSceneTimeline(
  steps: SceneStep[],
  {
    play,
    reduceMotion = false,
    restartKey = 0,
  }: {
    play: boolean;
    reduceMotion?: boolean;
    restartKey?: number;
  },
) {
  const [beat, setBeat] = useState(() =>
    reduceMotion ? (steps[steps.length - 1]?.set ?? "idle") : (steps[0]?.set ?? "idle"),
  );
  const timersRef = useRef<number[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);
  const playRef = useRef(play);
  const stepsRef = useRef(steps);
  playRef.current = play;
  stepsRef.current = steps;

  useEffect(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    startedAtRef.current = null;
    elapsedBeforePauseRef.current = 0;

    const currentSteps = stepsRef.current;
    if (!currentSteps.length) {
      setBeat("idle");
      return;
    }

    if (reduceMotion) {
      setBeat(currentSteps[currentSteps.length - 1]?.set ?? "idle");
      return;
    }

    setBeat(currentSteps[0]?.set ?? "idle");
  }, [restartKey, reduceMotion]);

  useEffect(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    const currentSteps = stepsRef.current;
    if (reduceMotion || !currentSteps.length) return;

    if (!play) {
      if (startedAtRef.current != null) {
        elapsedBeforePauseRef.current += performance.now() - startedAtRef.current;
        startedAtRef.current = null;
      }
      return;
    }

    const baseElapsed = elapsedBeforePauseRef.current;
    startedAtRef.current = performance.now();
    setBeat(beatAtElapsed(currentSteps, baseElapsed));

    for (const step of currentSteps) {
      if (step.at <= baseElapsed) continue;
      const delay = step.at - baseElapsed;
      const id = window.setTimeout(() => {
        if (playRef.current) setBeat(step.set);
      }, delay);
      timersRef.current.push(id);
    }

    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [play, reduceMotion, restartKey]);

  return beat;
}
