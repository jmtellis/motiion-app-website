-- Validate votes against every role included in the share.
create or replace function public.validate_casting_shortlist_share_vote()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.casting_shortlist_share_recipients r
    where r.id = new.recipient_id
      and r.share_id = new.share_id
  ) then
    raise exception 'recipient does not belong to share';
  end if;

  if not exists (
    select 1
    from public.casting_shortlist_shares sh
    join public.submissions s
      on s.id = new.submission_id
     and s.role_id = any(case when cardinality(sh.role_ids) > 0 then sh.role_ids else array[sh.role_id] end)
    where sh.id = new.share_id
      and sh.is_active = true
      and s.status = 'approved'
  ) then
    raise exception 'submission is not on the active shortlist';
  end if;

  return new;
end;
$$;
