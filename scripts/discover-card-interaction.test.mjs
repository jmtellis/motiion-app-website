import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync(new URL('../src/components/app/use-profile-card-interaction.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function setup() {
  const exports = {}, tasks = new Map(), calls = [];
  let next = 0, cleanup;
  vm.runInNewContext(compiled, { exports,
    require: name => name === 'react' ? { useRef: value => ({ current: value }), useEffect: fn => { cleanup = fn(); } } : { useRouter: () => ({ push: href => calls.push(href) }) },
    setTimeout: fn => { tasks.set(++next, fn); return next; }, clearTimeout: id => tasks.delete(id),
  });
  const interaction = exports.useProfileCardInteraction('/talent/profile/example', () => calls.push('preview'));
  return { interaction, calls, flush: () => { const pending = [...tasks.values()]; tasks.clear(); pending.forEach(fn => fn()); }, cleanup: () => cleanup() };
}
test('single click previews; a second tap opens the profile without preview', () => {
  const single = setup(); single.interaction.onClick({ detail: 1 }); single.flush(); assert.deepEqual(single.calls, ['preview']);
  const double = setup(); double.interaction.onClick({ detail: 1 }); double.interaction.onClick({ detail: 2 }); double.flush(); assert.deepEqual(double.calls, ['/talent/profile/example']);
  const touch = setup(); touch.interaction.onClick({ detail: 1 }); touch.interaction.onClick({ detail: 1 }); touch.flush(); assert.deepEqual(touch.calls, ['/talent/profile/example']);
});
test('Enter opens profile and suppresses default click; unmount cancels pending preview', () => {
  const state = setup(); let prevented = false;
  state.interaction.onClick({ detail: 1 });
  state.interaction.onKeyDown({ key: 'Enter', repeat: false, preventDefault: () => { prevented = true; } });
  state.flush(); assert.equal(prevented, true); assert.deepEqual(state.calls, ['/talent/profile/example']);
  const disposed = setup(); disposed.interaction.onClick({ detail: 1 }); disposed.cleanup(); disposed.flush(); assert.deepEqual(disposed.calls, []);
});
