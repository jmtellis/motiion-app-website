-- A stale application version is a permanent business conflict, not a transient
-- serialization failure. PostgREST retries 40001, which can leave the UI waiting.
-- Preserve the installed function bodies, grants, approval checks and triggers.
do $$
declare signature text; definition text;
begin
 foreach signature in array array[
  'public.review_industry_application(uuid,integer,text,text)',
  'public.submit_industry_application(text,text,text,text,text,text,integer)'
 ] loop
  definition := pg_get_functiondef(signature::regprocedure);
  if position('40001' in definition)>0 then
   execute replace(definition, '''40001''', '''PT409''');
  elsif position('PT409' in definition)=0 then
   raise exception 'Expected application version conflict check missing in %',signature;
  end if;
 end loop;
end $$;
notify pgrst, 'reload schema';
