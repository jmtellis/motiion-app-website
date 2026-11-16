import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync(new URL('../src/components/app/TalentDiscovery.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
test('preview follows the center during manual navigation and pauses idle until closed', () => {
  const people = ['a', 'b', 'c', 'd'].map(id => ({ id, name: id, slug: id }));
  const rows = [{ id: 'one', talent: people.slice(0, 2) }, { id: 'two', talent: people.slice(2) }];
  const state = []; let cursor = 0, idleEnabled;
  const slide = { activeRowIndex: 0, activeColIndex: 0, activeColByRowId: {}, isSlidingRef: { current: false },
    focusCell: (row, col) => { slide.activeRowIndex = row; slide.activeColIndex = col; },
    navigate: direction => { if (direction === 'row-down') slide.activeRowIndex = 1; else slide.activeColIndex = 1; },
  };
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(compiled, { exports, URLSearchParams,
    require: name => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return { useState: initial => { const key = cursor++; if (!(key in state)) state[key] = typeof initial === 'function' ? initial() : initial; return [state[key], value => { state[key] = typeof value === 'function' ? value(state[key]) : value; }]; }, useMemo: fn => fn(), useCallback: fn => fn, useEffect() {}, useRef: value => ({ current: value }) };
      if (name === 'next/navigation') return { useRouter: () => ({ push() {} }), useSearchParams: () => new URLSearchParams() };
      if (name.endsWith('/use-mobile-discover')) return { useMobileDiscover: () => false };
      if (name.endsWith('/use-discover-idle')) return { useDiscoverIdle: (_root, enabled) => { idleEnabled = enabled; } };
      if (name.endsWith('/use-navigator-slide')) return { useNavigatorSlide: () => slide };
      if (name.endsWith('/rows')) return { buildTalentRows: () => rows };
      return new Proxy({}, { get: (_target, key) => key });
    },
  });
  const render = () => { cursor = 0; return exports.TalentDiscovery({ initialData: { talent: people }, recentlyViewed: [], keyword: '', credit: '', currentUserId: 'viewer' }); };
  const find = (node, type) => {
    if (!node || typeof node !== 'object') return null;
    if (node.type === type) return node;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children.flat(Infinity) : [children]) { const found = find(child, type); if (found) return found; }
    return null;
  };
  let tree = render(); assert.equal(idleEnabled, true);
  find(tree, 'TalentNavigatorGrid').props.onOpenProfile(people[1]);
  tree = render(); assert.equal(idleEnabled, false);
  assert.equal(find(tree, 'DiscoverProfilePanel').props.talent.id, 'b');
  find(tree, 'TalentNavigatorGrid').props.onNavigate('row-down');
  tree = render();
  assert.equal(find(tree, 'DiscoverProfilePanel').props.talent.id, 'd');
  assert.equal(find(tree, 'TalentNavigatorGrid').props.selectedTalentId, 'd');
  assert.equal(idleEnabled, false);
  find(tree, 'DiscoverProfilePanel').props.onClose();
  tree = render(); assert.equal(idleEnabled, true);
  assert.equal(find(tree, 'DiscoverProfilePanel').props.open, false);
});
