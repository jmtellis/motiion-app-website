-- Read-only project membership must not grant casting management. Keep existing
-- project-scoped reads and approval requirements; use the same native-compatible
-- owner/admin predicate as scheduling and final selection commands.
alter policy industry_candidate_insert on public.casting_candidates
  with check (public.has_industry_approval() and public.is_project_operator(project_id, (select auth.uid())));

alter policy industry_candidate_update on public.casting_candidates
  using (public.has_industry_approval() and public.is_project_operator(project_id, (select auth.uid())))
  with check (public.has_industry_approval() and public.is_project_operator(project_id, (select auth.uid())));

alter policy industry_candidate_delete on public.casting_candidates
  using (public.has_industry_approval() and public.is_project_operator(project_id, (select auth.uid())));
