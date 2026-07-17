import { notFound } from "next/navigation";

import { CastingProjectCreatePage } from "@/components/talent-buyers/project/CastingProjectCreatePage";
import { TypedProjectCreatePage } from "@/components/talent-buyers/project/TypedProjectCreatePage";
import { isProjectType } from "@/lib/talent-buyers/project-types";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function NewTypedProjectPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  await requireHiringAccount();
  const { type } = await params;

  if (!isProjectType(type)) {
    notFound();
  }

  if (type === "casting") {
    return <CastingProjectCreatePage />;
  }

  return <TypedProjectCreatePage projectType={type} />;
}
