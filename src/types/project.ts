import type { ProjectType } from "@/lib/talent-buyers/project-types";

export type ProjectModules = {
  casting: boolean;
  activities: boolean;
};

export type ProjectAttachment = {
  id: string;
  title: string;
  file_url_string?: string | null;
  file_name?: string | null;
  content_type?: string | null;
  uploaded_at_iso8601?: string | null;
};

export type ProjectConfiguration = {
  attachments: ProjectAttachment[];
  composer_draft?: boolean;
  create_metadata?: Record<string, string>;
};

export type ProjectComposerForm = {
  projectId?: string | null;
  title: string;
  description: string;
  productionCompany: string;
  projectType: ProjectType;
  coverImageUrl: string;
  location: string;
  startDate: string;
  endDate: string;
  enabledModules: ProjectModules;
  configuration: ProjectConfiguration;
};

export type ProjectRecord = {
  id: string;
  poster_id: string;
  title: string;
  description: string | null;
  production_company: string | null;
  production_company_logo_url?: string | null;
  cover_image_url: string | null;
  cover_thumbnail_alignment?: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  rate_type?: string | null;
  rate_details?: Record<string, unknown> | null;
  project_type: string | null;
  enabled_modules: ProjectModules | null;
  project_configuration: ProjectConfiguration | null;
  is_active: boolean | null;
  casting_configuration: Record<string, unknown> | null;
  updated_at: string | null;
  created_at: string | null;
};

export type CreateProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export type UpdateProjectResult = CreateProjectResult;

export type DeleteProjectResult = { ok: true } | { ok: false; error: string };
