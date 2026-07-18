import { notFound } from "next/navigation";

import { BuyerAppPage } from "@/components/talent-buyers/dashboard/BuyerAppPage";
import { ProjectCreateShell } from "@/components/talent-buyers/project/ProjectCreateShell";
import { ProjectEditChrome } from "@/components/talent-buyers/project/ProjectEditChrome";
import { fetchProjectRecord, projectRecordToComposerForm } from "@/lib/talent-buyers/projects";
import { requireHiringAccount } from "@/lib/auth/session";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireHiringAccount();
  const { id } = await params;
  const project = await fetchProjectRecord(id, profile.id);
  if (!project) notFound();

  const initialForm = projectRecordToComposerForm(project);

  return (
    <BuyerAppPage fullWidth>
      <ProjectEditChrome projectId={id} projectTitle={project.title} />
      <ProjectCreateShell initialForm={initialForm} mode="edit" />
    </BuyerAppPage>
  );
}
