-- Match the original account status RPC permissions.
revoke all on function public.account_pro_status(uuid) from public, anon;
grant execute on function public.account_pro_status(uuid) to authenticated, service_role;
