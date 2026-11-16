import assert from 'node:assert/strict';
import test from 'node:test';
import { createWheelNavigation, swipeDirection, consumeSwipe } from '../src/lib/talent-navigator/wheel-navigation';

test('small trackpad deltas accumulate and vertical gestures follow scroll direction', () => {
  const wheel = createWheelNavigation();
  assert.equal(wheel(0, 12, 0, 0), null);
  assert.equal(wheel(0, 12, 0, 16), null);
  assert.equal(wheel(0, 12, 0, 32), 'row-down');
  assert.equal(wheel(0, -40, 0, 500), 'row-up');
});
test('a long wheel swipe and its momentum advance once; the next swipe needs no mouse movement', () => {
  const wheel = createWheelNavigation();
  assert.equal(wheel(60, 10, 0, 0), 'col-right');
  for (let t = 20; t <= 1600; t += 20) assert.equal(wheel(40, 0, 0, t), null);
  assert.equal(wheel(0, 60, 0, 1800), 'row-down');
  assert.equal(wheel(0, 30, 0, 1820), null);
  assert.equal(wheel(-40, 0, 0, 2040), 'col-left');
});
test('touch movement and release cannot advance twice, and a new touch can advance again', () => {
  const touch = { x: 200, y: 200, moved: false, consumed: false };
  assert.equal(consumeSwipe(touch, 150, 200), 'col-right');
  assert.equal(consumeSwipe(touch, 50, 200), null);
  assert.equal(consumeSwipe(touch, 50, 30), null);
  assert.equal(consumeSwipe(touch, 50, 30), null); // release
  assert.equal(touch.moved, true);
  assert.equal(consumeSwipe({ x: 200, y: 200, moved: false, consumed: false }, 200, 100), 'row-down');
});
test('line and page wheel units are normalized', () => {
  assert.equal(createWheelNavigation()(0, 3, 1, 0), 'row-down');
  assert.equal(createWheelNavigation()(0, -1, 2, 0), 'row-up');
});

test('swipes follow the finger on the dominant axis and ignore tap jitter', () => {
  assert.equal(swipeDirection(100, 100, 80, 95), null);
  assert.equal(swipeDirection(100, 100, 40, 90), 'col-right');
  assert.equal(swipeDirection(100, 100, 160, 110), 'col-left');
  assert.equal(swipeDirection(100, 100, 110, 40), 'row-down');
  assert.equal(swipeDirection(100, 100, 90, 160), 'row-up');
});

test('a fresh same-direction swipe during an inertia tail advances exactly once', () => {
  const wheel = createWheelNavigation();
  assert.equal(wheel(0, 60, 0, 0), 'row-down');
  for (let t = 20; t <= 400; t += 20) assert.equal(wheel(0, 60 - t / 10, 0, t), null);
  assert.equal(wheel(0, 10, 0, 420), null);
  assert.equal(wheel(0, 8, 0, 440), null);
  assert.equal(wheel(0, 40, 0, 460), 'row-down');
  for (let t = 480; t <= 1000; t += 20) assert.equal(wheel(0, Math.max(1, 40 - (t - 480) / 12), 0, t), null);
  assert.equal(wheel(0, 40, 0, 1020), 'row-down');
});
test('changing axis does not require waiting for inertia to stop or moving the cursor', () => {
  const wheel = createWheelNavigation();
  assert.equal(wheel(0, 60, 0, 0), 'row-down');
  for (let t = 20; t <= 440; t += 20) assert.equal(wheel(0, 30, 0, t), null);
  assert.equal(wheel(40, 0, 0, 460), 'col-right');
  assert.equal(wheel(40, 0, 0, 480), null);
});
