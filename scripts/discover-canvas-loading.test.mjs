import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real orchestration without network/auth dependencies.
const compiled = ts.transpileModule(readFileSync(new URL('../src/lib/app/discover-canvas.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const result = { items: [], total: 0, page: 1, pageSize: 24 };
function loader(overrides) {
  const exports = {};
  const dependencies = {
    searchBrowseTalent: async () => result,
    searchTalentProfiles: async () => result,
    fetchRecentlyViewedTalent: async () => ({ talent: [] }),
    buildNavigatorInitialData: value => ({ talent: value.items }),
    ...overrides,
  };
  vm.runInNewContext(compiled, { exports, require: () => dependencies, URLSearchParams });
  return exports.loadDiscoverCanvas;
}

test('Explore starts browse, navigator and recent reads without waiting for one another', async () => {
  const started = [];
  const finish = {};
  const deferred = key => () => { started.push(key); return new Promise(resolve => { finish[key] = resolve; }); };
  const load = loader({ searchBrowseTalent: deferred('browse'), searchTalentProfiles: deferred('navigator'), fetchRecentlyViewedTalent: deferred('recent') });
  const pending = load({}, '/talent');
  assert.deepEqual(started.sort(), ['browse', 'navigator', 'recent']);
  finish.navigator(result);
  finish.browse(result);
  finish.recent({ talent: [] });
  assert.equal((await pending).result.total, 0);
});

test('list layout does not pay for a navigator query; optional recent failure does not hide results', async () => {
  const load = loader({ searchTalentProfiles: () => { throw new Error('Unexpected navigator request'); }, fetchRecentlyViewedTalent: async () => { throw new Error('Unavailable history'); } });
  const canvas = await load({ layout: 'list' }, '/talent');
  assert.equal(canvas.result, result);
  assert.equal(canvas.recentlyViewed.length, 0);
});

test('out-of-range page redirects preserve filters after parallel loading', async () => {
  const load = loader({ searchBrowseTalent: async () => ({ ...result, total: 30, page: 9 }) });
  const canvas = await load({ page: '9', keyword: 'jazz', layout: 'list' }, '/talent');
  assert.equal(canvas.redirectTo, '/talent?keyword=jazz&layout=list&page=2');
});
