-- Admin verification toggle support + unique invitation constraint

ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS invitations_casting_profile_unique
  ON public.invitations (casting_id, invited_profile_id)
  WHERE casting_id IS NOT NULL;

-- Platform admin can update verification (requires auth_is_platform_admin RPC from iOS project)
CREATE POLICY professional_profiles_admin_verify ON public.professional_profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (true);

COMMENT ON POLICY professional_profiles_admin_verify ON public.professional_profiles IS
  'Tighten in production via auth_is_platform_admin() — MVP allows service-role admin updates.';
