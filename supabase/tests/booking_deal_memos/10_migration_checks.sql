-- MOT-94 migration behaviour checks (run via run.sh against a throwaway local Postgres).
\set ON_ERROR_STOP on
create or replace function pg_temp.expect_error(p_sql text, p_pattern text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'EXPECTED ERROR % but succeeded: %', p_pattern, p_sql;
exception when others then
  if sqlerrm like 'EXPECTED ERROR%' then raise; end if;
  if sqlerrm !~ p_pattern then
    raise exception 'wrong error for %: got "%" wanted /%/', p_sql, sqlerrm, p_pattern;
  end if;
  raise notice 'ok error /%/: %', p_pattern, sqlerrm;
end $$;

insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), -- industry
  ('00000000-0000-0000-0000-00000000000b'), -- talent
  ('00000000-0000-0000-0000-00000000000c'), -- community
  ('00000000-0000-0000-0000-00000000000d'); -- other
insert into public.profiles values
  ('00000000-0000-0000-0000-00000000000a', '{talent,lookingForTalent}'),
  ('00000000-0000-0000-0000-00000000000b', '{talent}'),
  ('00000000-0000-0000-0000-00000000000c', '{community}'),
  ('00000000-0000-0000-0000-00000000000d', '{talent}');
insert into public.projects (id, owner_id) values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a');
insert into public.availability_check_requests (id, requester_id, talent_id, project_id, status, response_kind) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001', 'submitted', 'available'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', null, 'pending', null),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000b', null, 'submitted', 'available'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', null, 'submitted', 'unavailable'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', null, 'submitted', 'available_with_conflict');

-- Service-role create
create temp table t_ids (k text primary key, id uuid);
grant select on t_ids to authenticated;
insert into t_ids select 'm1', (public.booking_deal_memo_write(null, null,
  '{"availability_check_request_id":"20000000-0000-0000-0000-000000000001","industry_user_id":"00000000-0000-0000-0000-00000000000a","talent_user_id":"00000000-0000-0000-0000-00000000000b","idempotency_key":"idem-key-0001"}',
  null,
  '[{"module_code":"services_role","section":"role_credit","sort_order":1,"value":{"role":"dancer","role_title":"Lead"}},{"module_code":"rates","section":"money","sort_order":2,"value":{"tour_weekly_rate_cents":100000,"tour_weeks":1}}]',
  '{"action":"draft_saved","actor_role":"industry","actor_user_id":"00000000-0000-0000-0000-00000000000a"}')).id;

do $$ declare r public.booking_deal_memos; begin
  select * into r from public.booking_deal_memos where id = (select id from t_ids where k='m1');
  assert r.status = 'draft' and r.version = 1, 'draft v1';
  assert r.project_id = '10000000-0000-0000-0000-000000000001', 'project defaulted from availability';
  assert (select count(*) from public.booking_deal_memo_provisions where memo_id = r.id) = 2, 'provisions';
  assert (select count(*) from public.booking_deal_memo_events where memo_id = r.id) = 1, 'event';
end $$;

select pg_temp.expect_error($q$select public.booking_deal_memo_write(null, null, '{"availability_check_request_id":"20000000-0000-0000-0000-000000000002","industry_user_id":"00000000-0000-0000-0000-00000000000a","talent_user_id":"00000000-0000-0000-0000-00000000000b"}', null, null, null)$q$, 'AVAILABILITY_NOT_ELIGIBLE');
select pg_temp.expect_error($q$select public.booking_deal_memo_write(null, null, '{"availability_check_request_id":"20000000-0000-0000-0000-000000000004","industry_user_id":"00000000-0000-0000-0000-00000000000a","talent_user_id":"00000000-0000-0000-0000-00000000000b"}', null, null, null)$q$, 'AVAILABILITY_NOT_ELIGIBLE');
select pg_temp.expect_error($q$select public.booking_deal_memo_write(null, null, '{"availability_check_request_id":"20000000-0000-0000-0000-000000000001","industry_user_id":"00000000-0000-0000-0000-00000000000d","talent_user_id":"00000000-0000-0000-0000-00000000000b"}', null, null, null)$q$, 'AVAILABILITY_NOT_ELIGIBLE');
select pg_temp.expect_error($q$select public.booking_deal_memo_write(null, null, '{"availability_check_request_id":"20000000-0000-0000-0000-000000000003","industry_user_id":"00000000-0000-0000-0000-00000000000c","talent_user_id":"00000000-0000-0000-0000-00000000000b"}', null, null, null)$q$, 'COMMUNITY_NOT_ALLOWED');
select pg_temp.expect_error($q$select public.booking_deal_memo_write(null, null, '{"availability_check_request_id":"20000000-0000-0000-0000-000000000001","industry_user_id":"00000000-0000-0000-0000-00000000000a","talent_user_id":"00000000-0000-0000-0000-00000000000b"}', null, null, null)$q$, 'booking_deal_memos_active_availability_uidx');
select pg_temp.expect_error($q$select public.booking_deal_memo_write(null, null, '{"availability_check_request_id":"20000000-0000-0000-0000-000000000005","industry_user_id":"00000000-0000-0000-0000-00000000000a","talent_user_id":"00000000-0000-0000-0000-00000000000b","template_key":"class_instructor"}', null, null, null)$q$, 'template_key_check');
select pg_temp.expect_error($q$select public.booking_deal_memo_write(null, null, '{"availability_check_request_id":"20000000-0000-0000-0000-000000000005","industry_user_id":"00000000-0000-0000-0000-00000000000a","talent_user_id":"00000000-0000-0000-0000-00000000000b","idempotency_key":"idem-key-0001"}', null, null, null)$q$, 'booking_deal_memos_idempotency_uidx');

-- Illegal patches
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, null, null, '{"status":"paid"}', null, null)$q$, (select id from t_ids where k='m1')), 'invalid_transition');
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, null, null, '{"talent_deal_cents":100000,"platform_fee_cents":9000,"charge_amount_cents":109000}', null, null)$q$, (select id from t_ids where k='m1')), 'fee_on_top');
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, null, null, '{"status":"offered"}', null, null)$q$, (select id from t_ids where k='m1')), 'awaiting_party_state');
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, 99, null, '{"cover_note":"x"}', null, null)$q$, (select id from t_ids where k='m1')), 'MEMO_CONFLICT');
select pg_temp.expect_error($q$select public.booking_deal_memo_write('30000000-0000-0000-0000-000000000009', null, null, '{"cover_note":"x"}', null, null)$q$, 'NOT_FOUND');
-- Identity keys in the patch are stripped, not applied
select public.booking_deal_memo_write((select id from t_ids where k='m1'), 1, null, '{"talent_user_id":"00000000-0000-0000-0000-00000000000d","cover_note":"Hi"}', null, null);
do $$ begin
  assert (select talent_user_id from public.booking_deal_memos where id=(select id from t_ids where k='m1')) = '00000000-0000-0000-0000-00000000000b', 'identity kept';
  assert (select version from public.booking_deal_memos where id=(select id from t_ids where k='m1')) = 2, 'version bumped';
end $$;

-- Send
select public.booking_deal_memo_write((select id from t_ids where k='m1'), 2, null,
  '{"status":"offered","awaiting_party":"talent","offered_at":"2026-09-29T00:00:00Z","talent_deal_cents":100000,"platform_fee_cents":10000,"charge_amount_cents":110000}', null,
  '{"action":"sent","actor_role":"industry"}');

-- Client-session checks
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  assert (select count(*) from public.booking_deal_memos) = 1, 'talent sees sent memo';
  assert (select count(*) from public.booking_deal_memo_provisions) = 2, 'talent sees provisions';
  assert public.booking_deal_memo_payout_ready((select id from public.booking_deal_memos limit 1)) = false, 'no payout yet';
end $$;
select pg_temp.expect_error($q$update public.booking_deal_memos set status='paid'$q$, 'permission denied');
select pg_temp.expect_error($q$insert into public.booking_deal_memo_events (memo_id, actor_role, action) select id, 'talent', 'sent' from public.booking_deal_memos$q$, 'permission denied');
select pg_temp.expect_error($q$select public.booking_deal_memo_write(null, null, null, null, null, null)$q$, 'permission denied');
select pg_temp.expect_error($q$select public.booking_deal_memos_expire_stale()$q$, 'permission denied');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
do $$ begin
  assert (select count(*) from public.booking_deal_memos) = 0, 'stranger sees nothing';
  assert (select count(*) from public.booking_deal_memo_events) = 0, 'stranger sees no events';
end $$;
reset role;
select set_config('request.jwt.claim.role', '', false);
select set_config('request.jwt.claim.sub', '', false);

-- Even with table grants, a client JWT session is blocked by the guard trigger.
grant update on public.booking_deal_memos to authenticated;
create policy tmp_all on public.booking_deal_memos for update to authenticated using (true);
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.expect_error($q$update public.booking_deal_memos set stripe_payment_intent_id='pi_forged'$q$, 'service_role_only');
reset role;
select set_config('request.jwt.claim.role', '', false);
drop policy tmp_all on public.booking_deal_memos;
revoke update on public.booking_deal_memos from authenticated;

-- Talent flags then accepts
select public.booking_deal_memo_write((select id from t_ids where k='m1'), null, null,
  '{"status":"negotiating","awaiting_party":"industry","negotiation_round":1}',
  '[{"module_code":"rates","section":"money","sort_order":2,"value":{"tour_weekly_rate_cents":100000,"tour_weeks":1},"state":"change_requested","talent_flag":"dispute","talent_proposed_value":{"tour_weekly_rate_cents":120000,"tour_weeks":1}}]',
  '{"action":"talent_flagged","actor_role":"talent"}');
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, null, null, null, '[{"module_code":"rates","section":"money","state":"change_requested"}]', null)$q$, (select id from t_ids where k='m1')), 'flag_state');
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, null, null, '{"status":"payment_pending","awaiting_party":null}', null, null)$q$, (select id from t_ids where k='m1')), 'ready_snapshot');
select public.booking_deal_memo_write((select id from t_ids where k='m1'), null, null,
  '{"status":"payment_pending","awaiting_party":null,"accepted_at":"2026-09-29T00:00:00Z","talent_signed_at":"2026-09-29T00:00:00Z","talent_signed_name":"Tee Talent","expires_at":"2026-10-06T00:00:00Z","talent_deal_cents":120000,"platform_fee_cents":12000,"charge_amount_cents":132000}',
  '[{"module_code":"rates","section":"money","sort_order":2,"value":{"tour_weekly_rate_cents":120000,"tour_weeks":1},"state":"accepted"},{"module_code":"services_role","section":"role_credit","sort_order":1,"value":{"role":"dancer","role_title":"Lead"},"state":"accepted"}]',
  '{"action":"talent_accepted","actor_role":"talent"}');

-- Locked terms
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, null, null, null, '[{"module_code":"rates","section":"money","value":{}}]', null)$q$, (select id from t_ids where k='m1')), 'terms_locked');
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, null, null, '{"talent_deal_cents":200000,"platform_fee_cents":20000,"charge_amount_cents":220000}', null, null)$q$, (select id from t_ids where k='m1')), 'terms_locked');
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, null, null, '{"status":"paid","paid_at":"2026-09-29T00:00:00Z","stripe_payment_intent_id":"pi_1"}', null, null)$q$, (select id from t_ids where k='m1')), 'paid_requires_payment');

-- Checkout + pay (webhook replay is a no-op)
select public.booking_deal_memo_write((select id from t_ids where k='m1'), null, null,
  '{"industry_signed_name":"Ivy Industry","industry_signed_at":"2026-09-29T00:00:00Z","stripe_payment_intent_id":"pi_1","stripe_destination_account_id":"acct_123","payment_state":"requires_payment"}', null,
  '{"action":"checkout_started","actor_role":"industry"}');
select public.booking_deal_memo_write((select id from t_ids where k='m1'), null, null,
  '{"status":"paid","paid_at":"2026-09-29T01:00:00Z","payment_state":"succeeded","stripe_charge_id":"ch_1"}', null,
  '{"action":"payment_succeeded","actor_role":"stripe","stripe_event_id":"evt_1"}');
do $$ declare v int; begin
  select version into v from public.booking_deal_memos where id=(select id from t_ids where k='m1');
  perform public.booking_deal_memo_write((select id from t_ids where k='m1'), null, null, '{"payment_state":"failed"}', null, '{"action":"payment_succeeded","actor_role":"stripe","stripe_event_id":"evt_1"}');
  assert (select version from public.booking_deal_memos where id=(select id from t_ids where k='m1')) = v, 'replay no-op';
  assert (select payment_state from public.booking_deal_memos where id=(select id from t_ids where k='m1')) = 'succeeded', 'replay no-op state';
end $$;
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, null, null, '{"stripe_payment_intent_id":"pi_2"}', null, null)$q$, (select id from t_ids where k='m1')), 'payment_locked');

-- Refund: partial, then full → cancelled, then dispute on cancelled paid memo still allowed
select public.booking_deal_memo_write((select id from t_ids where k='m1'), null, null, '{"payment_state":"partially_refunded","amount_refunded_cents":1000}', null, '{"action":"refunded","actor_role":"stripe","stripe_event_id":"evt_2"}');
select public.booking_deal_memo_write((select id from t_ids where k='m1'), null, null, '{"status":"cancelled","cancelled_at":"2026-09-30T00:00:00Z","payment_state":"refunded","amount_refunded_cents":132000}', null, '{"action":"refunded","actor_role":"stripe","stripe_event_id":"evt_3"}');
select public.booking_deal_memo_write((select id from t_ids where k='m1'), null, null, '{"payment_state":"disputed"}', null, '{"action":"dispute_opened","actor_role":"stripe","stripe_event_id":"evt_4"}');
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, null, null, '{"amount_refunded_cents":999999}', null, null)$q$, (select id from t_ids where k='m1')), 'refund_within_charge');
select pg_temp.expect_error($q$update public.booking_deal_memo_events set action = 'sent'$q$, 'append_only');

-- Second memo: expiry, then late payment, then terminal immutability
insert into t_ids select 'm2', (public.booking_deal_memo_write(null, null,
  '{"availability_check_request_id":"20000000-0000-0000-0000-000000000005","industry_user_id":"00000000-0000-0000-0000-00000000000a","talent_user_id":"00000000-0000-0000-0000-00000000000b"}', null, null, null)).id;
select public.booking_deal_memo_write((select id from t_ids where k='m2'), null, null, '{"status":"offered","awaiting_party":"talent"}', null, null);
select public.booking_deal_memo_write((select id from t_ids where k='m2'), null, null,
  '{"status":"payment_pending","awaiting_party":null,"accepted_at":"2026-09-01T00:00:00Z","talent_signed_at":"2026-09-01T00:00:00Z","talent_signed_name":"Tee","expires_at":"2026-09-08T00:00:00Z","talent_deal_cents":5000,"platform_fee_cents":500,"charge_amount_cents":5500}', null, null);
do $$ begin assert public.booking_deal_memos_expire_stale() = 1, 'expired one'; end $$;
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, null, null, '{"cover_note":"late"}', null, null)$q$, (select id from t_ids where k='m2')), 'booking_deal_memo_terminal');
-- After expiry the availability request can host a fresh memo; a late payment on the expired one
-- collides until Edge cancels the unpaid newcomer.
insert into t_ids select 'm3', (public.booking_deal_memo_write(null, null,
  '{"availability_check_request_id":"20000000-0000-0000-0000-000000000005","industry_user_id":"00000000-0000-0000-0000-00000000000a","talent_user_id":"00000000-0000-0000-0000-00000000000b"}', null, null, null)).id;
select pg_temp.expect_error(format($q$select public.booking_deal_memo_write(%L, null, null, '{"status":"paid","paid_at":"2026-09-09T00:00:00Z","industry_signed_at":"2026-09-01T00:00:00Z","industry_signed_name":"Ivy","stripe_payment_intent_id":"pi_late","payment_state":"succeeded"}', null, null)$q$, (select id from t_ids where k='m2')), 'active_availability_uidx');
select public.booking_deal_memo_write((select id from t_ids where k='m3'), null, null, '{"status":"cancelled","cancelled_at":"2026-09-09T00:00:00Z"}', null, null);
select public.booking_deal_memo_write((select id from t_ids where k='m2'), null, null,
  '{"status":"paid","paid_at":"2026-09-09T00:00:00Z","industry_signed_at":"2026-09-01T00:00:00Z","industry_signed_name":"Ivy","stripe_payment_intent_id":"pi_late","payment_state":"succeeded"}', null, null);

-- Payout readiness
insert into public.booking_payout_accounts (user_id, stripe_account_id, stripe_transfers_status) values ('00000000-0000-0000-0000-00000000000b', 'acct_talent1', 'active');
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin
  assert public.booking_deal_memo_payout_ready((select id from t_ids where k='m1')) = true, 'industry sees payout ready';
  assert (select count(*) from public.booking_payout_accounts) = 0, 'industry cannot read talent payout row';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
do $$ begin assert public.booking_deal_memo_payout_ready((select id from t_ids where k='m1')) = false, 'stranger gets false'; end $$;
reset role;
select set_config('request.jwt.claim.role', '', false);
select set_config('request.jwt.claim.sub', '', false);

-- Cascades from a client session: project delete, then user delete
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
reset role;
grant delete on public.projects to authenticated;
set role authenticated;
delete from public.projects;
reset role;
do $$ begin assert (select count(*) from public.booking_deal_memos where project_id is not null) = 0, 'project nulled'; end $$;
select set_config('request.jwt.claim.role', '', false);
select public.booking_deal_memo_write((select id from t_ids where k='m1'), null, null, null, null, '{"action":"call_requested","actor_role":"system","actor_user_id":"00000000-0000-0000-0000-00000000000d"}');
delete from auth.users where id = '00000000-0000-0000-0000-00000000000d';
do $$ begin assert (select count(*) from public.booking_deal_memo_events where action='call_requested' and actor_user_id is null) = 1, 'actor nulled'; end $$;
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.booking_deal_memos) = 0, 'memos cascaded';
  assert (select count(*) from public.booking_deal_memo_provisions) = 0, 'provisions cascaded';
  assert (select count(*) from public.booking_payout_accounts) = 0, 'payout cascaded';
end $$;
select 'ALL TESTS PASSED';
