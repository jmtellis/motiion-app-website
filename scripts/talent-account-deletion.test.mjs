import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/app/settings/actions.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function fixture({ user = { id: 'signed-in-user' }, accountType = 'talent', profileError = null, rpcError = null } = {}) {
  const calls = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      signOut: async () => { calls.push('signOut'); },
    },
    from: (table) => {
      assert.equal(table, 'profiles');
      return { select: () => ({ eq: (key, id) => {
        assert.equal(key, 'user_id');
        assert.equal(id, 'signed-in-user');
        return { maybeSingle: async () => ({ data: accountType ? { account_type: accountType } : null, error: profileError }) };
      } }) };
    },
    rpc: async (...args) => { calls.push(args); return { error: rpcError }; },
  };
  const exports = {};
  new Function('require', 'exports', compiled)((name) => {
    assert.equal(name, '@/lib/supabase/server');
    return { createServerSupabaseClient: async () => client };
  }, exports);
  return { deleteAccount: exports.deleteTalentAccount, calls };
}

test('unauthenticated, missing and industry profiles cannot invoke talent deletion', async () => {
  for (const options of [{ user: null }, { accountType: null }, { accountType: 'lookingForTalent' }, { profileError: { message: 'offline' } }]) {
    const { deleteAccount, calls } = fixture(options);
    assert.equal((await deleteAccount()).ok, false);
    assert.deepEqual(calls, []);
  }
});
test('talent and community deletion use the current-session RPC and sign out afterward', async () => {
  for (const accountType of ['talent', 'community']) {
    const { deleteAccount, calls } = fixture({ accountType });
    assert.deepEqual(await deleteAccount(), { ok: true });
    assert.deepEqual(calls, [['delete_my_account'], 'signOut']);
  }
});
test('database failure keeps the user signed in and returns an error', async () => {
  const { deleteAccount, calls } = fixture({ rpcError: { message: 'failed' } });
  assert.equal((await deleteAccount()).ok, false);
  assert.deepEqual(calls, [['delete_my_account']]);
});
