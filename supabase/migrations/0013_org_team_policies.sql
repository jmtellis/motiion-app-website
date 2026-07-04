-- RLS policies for organizations, teams, team_members (buyer org creation)

DROP POLICY IF EXISTS orgs_select_member ON public.organizations;
CREATE POLICY orgs_select_member ON public.organizations
  FOR SELECT USING (id IN (SELECT public.user_org_ids(auth.uid())) OR created_by = auth.uid());

DROP POLICY IF EXISTS orgs_insert_authenticated ON public.organizations;
CREATE POLICY orgs_insert_authenticated ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS teams_select_member ON public.teams;
CREATE POLICY teams_select_member ON public.teams
  FOR SELECT USING (
    organization_id IN (SELECT public.user_org_ids(auth.uid()))
    OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.created_by = auth.uid())
  );

DROP POLICY IF EXISTS teams_insert_org_creator ON public.teams;
CREATE POLICY teams_insert_org_creator ON public.teams
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = organization_id AND o.created_by = auth.uid())
  );

DROP POLICY IF EXISTS team_members_select ON public.team_members;
CREATE POLICY team_members_select ON public.team_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.organizations o ON o.id = t.organization_id
      WHERE o.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS team_members_insert ON public.team_members;
CREATE POLICY team_members_insert ON public.team_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.organizations o ON o.id = t.organization_id
      WHERE o.created_by = auth.uid()
    )
  );
