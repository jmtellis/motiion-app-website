-- Collection metadata for Library / Collections redesign
ALTER TABLE public.talent_lists
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.set_talent_lists_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS talent_lists_set_updated_at ON public.talent_lists;
CREATE TRIGGER talent_lists_set_updated_at
  BEFORE UPDATE ON public.talent_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_talent_lists_updated_at();
