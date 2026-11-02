import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/app/settings/actions.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function fixture({ user = { id: 'signed-in-user' }, accountType = 'talent', enabledShells = null, profileError = null, rpcError = null, billing = { ok: true } } = {}) {
  const calls = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user }, error: null }),
      signOut: async () => { calls.push('signOut'); },
    },
    from: () => ({ select: () => ({ eq: (key, id) => {
      assert.equal(key, 'user_id');
      assert.equal(id, 'signed-in-user');
      return { maybeSingle: async () => ({ data: accountType ? { account_type: accountType, enabled_shells: enabledShells } : null, error: profileError }) };
    } }) }),
    rpc: async (...args) => { calls.push(args); return { error: rpcError }; },
  };
  const modules = {
    '@/lib/supabase/server': { createServerSupabaseClient: async () => client },
    '@/lib/billing/account-deletion': { checkAccountDeletionBilling: async (userId) => { calls.push(['billing', userId]); return billing; } },
    '@/lib/auth/profile': { normalizeShell: value => value === 'looking_for_talent' ? 'lookingForTalent' : value ?? null },
  };
  const exports = {};
  new Function('require', 'exports', compiled)((name) => { if (!(name in modules)) throw new Error(`Unexpected runtime dependency: ${name}`); return modules[name]; }, exports);
  return { deleteAccount: exports.deleteTalentAccount, calls };
}

test('unauthenticated, missing and industry-only profiles cannot invoke talent deletion', async () => {
  for (const options of [{ user: null }, { accountType: null }, { accountType: 'lookingForTalent' }, { profileError: { message: 'offline' } }]) {
    const { deleteAccount, calls } = fixture(options);
    assert.equal((await deleteAccount()).ok, false);
    assert.deepEqual(calls, []);
  }
});
test('talent and community deletion verify billing before current-session RPC and sign-out', async () => {
  for (const accountType of ['talent', 'community']) {
    const { deleteAccount, calls } = fixture({ accountType });
    assert.deepEqual(await deleteAccount(), { ok: true });
    assert.deepEqual(calls, [['billing', 'signed-in-user'], ['delete_my_account'], 'signOut']);
  }
});
test('an industry-origin dual account can delete from its enabled talent settings', async () => {
  const { deleteAccount, calls } = fixture({ accountType: 'lookingForTalent', enabledShells: ['lookingForTalent', 'talent'] });
  assert.deepEqual(await deleteAccount(), { ok: true });
  assert.deepEqual(calls, [['billing', 'signed-in-user'], ['delete_my_account'], 'signOut']);
});
test('renewing subscription or unavailable billing preserves account and session', async () => {
  for (const billing of [{ ok: false, billingRequired: true, error: 'Cancel renewal first' }, { ok: false, error: 'Provider unavailable' }]) {
    const { deleteAccount, calls } = fixture({ billing });
    assert.deepEqual(await deleteAccount(), billing);
    assert.deepEqual(calls, [['billing', 'signed-in-user']]);
  }
});
test('database failure keeps the user signed in and returns an error', async () => {
  const { deleteAccount, calls } = fixture({ rpcError: { message: 'failed' } });
  assert.equal((await deleteAccount()).ok, false);
  assert.deepEqual(calls, [['billing', 'signed-in-user'], ['delete_my_account']]);
});
