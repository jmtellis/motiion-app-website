import { notFound } from "next/navigation";

import { CastingComposer } from "@/components/talent-buyers/casting/CastingComposer";
import { castingRecordToComposerForm } from "@/lib/talent-buyers/casting-payload";
import { fetchPosterCastingDetail } from "@/lib/talent-buyers/casting-projects";
import { createDefaultRole } from "@/lib/talent-buyers/casting-composer-defaults";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function EditCastingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireHiringAccount();
  const { id } = await params;
  const detail = await fetchPosterCastingDetail(id, profile.id);

  if (!detail) {
    notFound();
  }

  const initialForm = castingRecordToComposerForm(detail.project, detail.roles);
  if (!initialForm.roles.length) {
    initialForm.roles = [createDefaultRole()];
  }

  return <CastingComposer initialForm={initialForm} mode="edit" />;
}
