import { notFound, redirect } from "next/navigation";

import { CastingProjectCreatePage } from "@/components/talent-buyers/project/CastingProjectCreatePage";
import {
  createIntentPath,
  isBuyerCreateIntent,
} from "@/lib/talent-buyers/create-intent";
import { isProjectType } from "@/lib/talent-buyers/project-types";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function NewTypedProjectPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  await requireHiringAccount();
  const { type } = await params;

  if (type === "casting") {
    return <CastingProjectCreatePage />;
  }

  // Event / class / session (and any matching activity intent) use the activity wizard.
  if (isBuyerCreateIntent(type) && type !== "casting") {
    redirect(createIntentPath(type));
  }

  // Legacy typed project creates are not part of MVP create — send buyers to the picker.
  if (isProjectType(type)) {
    redirect("/projects?create=1");
  }

  notFound();
}
