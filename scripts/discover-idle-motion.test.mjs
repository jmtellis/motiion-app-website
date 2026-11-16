import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('../src/lib/talent-navigator/use-discover-idle.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function setup(enabled = true) {
  let now = 0, tick, cleared = false;
  const cleanups = [], moves = [], listeners = new Map();
  const reduced = { matches: false, addEventListener() {}, removeEventListener() {} };
  const document = { hidden: false, activeElement: null, addEventListener() {}, removeEventListener() {}, querySelector: () => null };
  const node = { contains: value => value !== null, querySelector: () => null };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Date: { now: () => now },
    require: () => ({ useRef: value => ({ current: value }), useEffect: fn => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup); } }),
    document,
    window: { matchMedia: () => reduced, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name), setInterval: fn => { tick = fn; return 1; }, clearInterval: () => { cleared = true; } },
  });
  exports.useDiscoverIdle({ current: node }, enabled, direction => moves.push(direction));
  return { moves, reduced, document, listeners, advance: ms => { now += ms; tick?.(); }, stop: () => { cleanups.forEach(fn => fn()); return cleared; } };
}

test('idle waits, follows a row-changing pattern, and resets after interaction', () => {
  const state = setup();
  state.advance(11000); assert.equal(state.moves.length, 0);
  state.advance(1000); state.advance(8000); state.advance(8000);
  assert.deepEqual(state.moves, ['col-right', 'col-right', 'row-down']);
  state.listeners.get('pointerdown')();
  state.advance(8000); assert.equal(state.moves.length, 3);
  state.advance(4000); assert.equal(state.moves[3], 'col-left');
  assert.equal(state.stop(), true); assert.equal(state.listeners.size, 0);
});

test('reduced motion, hidden tabs, focus and pause prevent automatic movement', () => {
  const state = setup();
  state.reduced.matches = true; state.advance(30000);
  state.reduced.matches = false; state.document.hidden = true; state.advance(30000);
  state.document.hidden = false; state.document.activeElement = {}; state.advance(30000);
  assert.equal(state.moves.length, 0);
  state.document.activeElement = null; state.advance(12000);
  assert.equal(state.moves.length, 1);
  const paused = setup(false); paused.advance(60000); assert.equal(paused.moves.length, 0);
});
