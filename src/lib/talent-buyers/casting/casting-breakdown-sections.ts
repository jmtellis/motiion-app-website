import type { CastingComposerForm, CastingConfiguration } from "@/types/casting";

export function castingConfigurationToComposerForm(
  projectId: string,
  casting: {
    id: string;
    title: string;
    description?: string | null;
    visibility?: string | null;
    location?: string | null;
    configuration?: CastingConfiguration | null;
  },
  roles: CastingComposerForm["roles"] = [],
): CastingComposerForm {
  const configuration = casting.configuration ?? ({} as CastingConfiguration);
  const meta = (configuration as CastingConfiguration & { _composer_meta?: Record<string, unknown> })._composer_meta;

  return {
    projectId,
    castingId: casting.id,
    title: casting.title,
    description: casting.description ?? "",
    productionCompany: "",
    productionCompanyLogoUrl: "",
    rateType: (meta?.rate_type as CastingComposerForm["rateType"]) ?? "fixed",
    rateDetails: (meta?.rate_details as CastingComposerForm["rateDetails"]) ?? {},
    isUnion: Boolean(meta?.is_union),
    visibility: (casting.visibility as CastingComposerForm["visibility"]) ?? "public",
    password: "",
    coverImageUrl: "",
    coverThumbnailAlignment: "top",
    location: casting.location ?? (meta?.location as string | undefined) ?? "",
    startDate: (meta?.start_date as string | undefined) ?? "",
    endDate: (meta?.end_date as string | undefined) ?? "",
    configuration,
    roles,
  };
}
