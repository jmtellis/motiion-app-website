-- Normalize legacy project_type values onto the canonical workspace IA set.
-- project_type remains VARCHAR(40); validation stays application-layer.

UPDATE public.projects
SET project_type = 'talent_submission'
WHERE project_type = 'agency_submission';
