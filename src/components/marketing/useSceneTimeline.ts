"use client";
import { useEffect, useRef, useState } from "react";
export type SceneStep = { at: number; set: string };
function beatAtElapsed(steps: SceneStep[], elapsed: number) {
  let beat = steps[0]?.set ?? "idle";
  for (const step of steps) if (step.at <= elapsed) beat = step.set;
  return beat;
}
/** One timer subscription per playback interval; cleanup freezes elapsed time. */
export function useSceneTimeline(steps: SceneStep[], { play, reduceMotion = false, restartKey = 0 }: { play: boolean; reduceMotion?: boolean; restartKey?: number }) {
  const [state, setState] = useState({ key: restartKey, beat: steps[0]?.set ?? "idle" });
  const clock = useRef({ key: restartKey, elapsed: 0 });
  useEffect(() => {
    if (clock.current.key !== restartKey) clock.current = { key: restartKey, elapsed: 0 };
    if (!play || reduceMotion || !steps.length) return;
    const elapsed = clock.current.elapsed;
    const started = performance.now();
    const timers = [window.setTimeout(() => setState({ key: restartKey, beat: beatAtElapsed(steps, elapsed) }), 0)];
    for (const step of steps) if (step.at > elapsed) timers.push(window.setTimeout(() => setState({ key: restartKey, beat: step.set }), step.at - elapsed));
    return () => { timers.forEach(window.clearTimeout); clock.current.elapsed = elapsed + performance.now() - started; };
  }, [play, reduceMotion, restartKey, steps]);
  return reduceMotion ? steps.at(-1)?.set ?? "idle" : state.key === restartKey ? state.beat : steps[0]?.set ?? "idle";
}
