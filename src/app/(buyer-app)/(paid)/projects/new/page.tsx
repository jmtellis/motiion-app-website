import { redirect } from "next/navigation";

import { requireHiringAccount } from "@/lib/auth/session";
import { projectsCreateHref } from "@/lib/talent-buyers/projects-hub-constants";

export default async function NewProjectPage() {
  await requireHiringAccount();
  redirect(projectsCreateHref());
}
