import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync(new URL('../src/lib/talent-navigator/use-navigator-slide.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
test('navigation unlocks if a transition event is lost and clears its fallback on unmount', () => {
  const exports = {}, timers = new Map();
  let next = 0, cleanup;
  vm.runInNewContext(compiled, { exports,
    require: () => ({ useRef: value => ({ current: value }), useState: value => [value, () => {}], useCallback: fn => fn, useEffect: fn => { cleanup = fn(); } }),
    requestAnimationFrame: fn => fn(),
    setTimeout: fn => { timers.set(++next, fn); return next; }, clearTimeout: id => timers.delete(id),
  });
  const slide = exports.useNavigatorSlide([{ id: 'row', talent: [{ id: 'a' }, { id: 'b' }] }], 212, 278);
  slide.navigate('col-right');
  assert.equal(slide.isSlidingRef.current, true);
  [...timers.values()][0]();
  assert.equal(slide.isSlidingRef.current, false);
  slide.navigate('row-down');
  assert.equal(slide.isSlidingRef.current, true);
  slide.handleSlideComplete();
  assert.equal(slide.isSlidingRef.current, false);
  assert.equal(timers.size, 0);
  slide.navigate('col-left');
  cleanup();
  assert.equal(timers.size, 0);
});
