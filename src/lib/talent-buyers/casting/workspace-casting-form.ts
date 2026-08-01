import type { CastingProject, CastingRole } from "@/lib/talent-buyers/casting/casting-types";
import { createDefaultCastingComposerForm } from "@/lib/talent-buyers/casting-composer-defaults";
import type { CastingComposerForm, CastingConfiguration } from "@/types/casting";

import { castingConfigurationToComposerForm } from "./casting-breakdown-sections";

export function rolesToComposerRoles(roles: CastingRole[]): CastingComposerForm["roles"] {
  return roles.map((role) => ({
    clientId: role.id,
    id: role.id,
    title: role.name,
    description: role.description ?? "",
    ageRangeMin: role.ageRange?.min != null ? String(role.ageRange.min) : "",
    ageRangeMax: role.ageRange?.max != null ? String(role.ageRange.max) : "",
    gender: "",
    ethnicityPreferences: role.ethnicityPreferences ?? [],
    specialSkills: role.specialSkills ?? role.danceStyles ?? [],
    heightMin:
      role.heightMinDisplay ?? (role.heightRange?.min != null ? String(role.heightRange.min) : ""),
    heightMax:
      role.heightMaxDisplay ?? (role.heightRange?.max != null ? String(role.heightRange.max) : ""),
    agencyRequired: false,
    unionStatus: role.unionRequirement ?? "",
    peopleNeeded: String(role.quantityNeeded ?? 1),
    visibility: "public",
    password: "",
    cardColorPreset: "midnight",
    coverImageUrl: "",
    clientMatchFilters: null,
  }));
}

export function buildWorkspaceCastingForm(
  projectId: string,
  project: {
    title: string;
    productionCompany: string | null;
    productionCompanyLogoUrl?: string | null;
    coverImageUrl: string | null;
    location: string | null;
  },
  casting: CastingProject | null,
  roles: CastingRole[],
): CastingComposerForm {
  if (!casting) {
    return {
      ...createDefaultCastingComposerForm(),
      projectId,
      title: project.title,
      productionCompany: project.productionCompany ?? "",
      productionCompanyLogoUrl: project.productionCompanyLogoUrl ?? "",
      coverImageUrl: project.coverImageUrl ?? "",
      location: project.location ?? "",
    };
  }

  const base = castingConfigurationToComposerForm(
    projectId,
    {
      id: casting.id,
      title: casting.title,
      description: casting.description,
      visibility: casting.visibility,
      location: casting.location,
      configuration:
        (casting.configuration as CastingConfiguration | undefined) ?? undefined,
    },
    rolesToComposerRoles(roles),
  );

  const meta = (
    casting.configuration as CastingConfiguration & {
      _composer_meta?: { is_union?: boolean | null };
    }
  )?._composer_meta;

  return {
    ...base,
    title: casting.title || project.title || base.title,
    productionCompany:
      casting.companyName ||
      casting.clientName ||
      project.productionCompany ||
      base.productionCompany,
    productionCompanyLogoUrl: project.productionCompanyLogoUrl ?? base.productionCompanyLogoUrl,
    coverImageUrl: project.coverImageUrl || base.coverImageUrl,
    isUnion: meta?.is_union === true ? true : meta?.is_union === false ? false : null,
  };
}
