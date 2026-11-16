import type { NavigatorDirection } from "./use-navigator-slide";

/** Wheel events have no gesture-end signal. Recognize fresh input separately from inertia. */
export function createWheelNavigation() {
  let last = -Infinity;
  let steppedAt = -Infinity;
  let totalX = 0;
  let totalY = 0;
  let consumed = false;
  let peak = 0;
  let previousMagnitude = 0;
  let quietSamples = 0;
  let previousDirection: NavigatorDirection | null = null;
  return (x: number, y: number, mode: number, now: number): NavigatorDirection | null => {
    const scale = mode === 1 ? 16 : mode === 2 ? 800 : 1;
    x *= scale; y *= scale;
    const magnitude = Math.max(Math.abs(x), Math.abs(y));
    if (!magnitude) return null;
    const direction: NavigatorDirection = Math.abs(x) > Math.abs(y)
      ? x > 0 ? "col-right" : "col-left"
      : y > 0 ? "row-down" : "row-up";
    const separated = now - last > 180;
    const settled = now - steppedAt >= 440;
    const changedDirection = direction !== previousDirection && magnitude >= 12;
    const freshImpulse = quietSamples >= 2 && magnitude >= Math.max(8, previousMagnitude * 2, peak * .25);
    if (separated || (consumed && settled && (changedDirection || freshImpulse))) {
      totalX = 0; totalY = 0; consumed = false; peak = 0; quietSamples = 0;
    }
    last = now;
    peak = Math.max(peak, magnitude);
    quietSamples = magnitude < peak * .35 ? quietSamples + 1 : 0;
    previousMagnitude = magnitude;
    if (consumed) return null;
    totalX += x; totalY += y;
    if (Math.max(Math.abs(totalX), Math.abs(totalY)) < 36) return null;
    consumed = true;
    steppedAt = now;
    previousDirection = Math.abs(totalX) > Math.abs(totalY)
      ? totalX > 0 ? "col-right" : "col-left"
      : totalY > 0 ? "row-down" : "row-up";
    return previousDirection;
  };
}

/** Finger motion moves the canvas; a short or diagonal jitter remains a tap. */
export function swipeDirection(startX: number, startY: number, endX: number, endY: number): NavigatorDirection | null {
  const x = startX - endX;
  const y = startY - endY;
  if (Math.max(Math.abs(x), Math.abs(y)) < 36) return null;
  return Math.abs(x) > Math.abs(y)
    ? x > 0 ? "col-right" : "col-left"
    : y > 0 ? "row-down" : "row-up";
}

export type SwipeGesture = { x: number; y: number; moved: boolean; consumed: boolean };

/** Pointer-down starts a gesture; neither further movement nor release can repeat it. */
export function consumeSwipe(start: SwipeGesture, x: number, y: number): NavigatorDirection | null {
  if (Math.hypot(x - start.x, y - start.y) > 12) start.moved = true;
  if (start.consumed) return null;
  const direction = swipeDirection(start.x, start.y, x, y);
  if (direction) start.consumed = true;
  return direction;
}
