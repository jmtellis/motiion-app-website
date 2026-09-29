import { notFound, redirect } from "next/navigation";

import {
  createIntentPath,
  isBuyerCreateIntent,
} from "@/lib/talent-buyers/create-intent";
import { isProjectType } from "@/lib/talent-buyers/project-types";
import { projectsCreateHref } from "@/lib/talent-buyers/projects-hub-constants";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function NewTypedProjectPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  await requireHiringAccount();
  const { type } = await params;

  // Casting is a project ability: create the shell first, then turn Casting on from its home.
  if (type === "casting") {
    redirect(projectsCreateHref("casting"));
  }

  // Event / class / session (and any matching activity intent) use the activity wizard.
  if (isBuyerCreateIntent(type)) {
    redirect(createIntentPath(type));
  }

  if (isProjectType(type)) {
    redirect(projectsCreateHref());
  }

  notFound();
}
