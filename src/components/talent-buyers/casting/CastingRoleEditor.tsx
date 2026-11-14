"use client";
import { useRouter } from "next/navigation";
import { saveProjectCastingChanges, saveProjectCastingDraft, saveProjectRoleDetails } from "@/app/(buyer-app)/(paid)/projects/[id]/castings/actions";
import { useProjectWorkspace } from "../project/ProjectWorkspaceContext";
import { useToast } from "../dashboard/ToastProvider";
import { buildWorkspaceCastingForm } from "@/lib/talent-buyers/casting/workspace-casting-form";
import { CastingRoleStep } from "./wizard-steps/CastingRoleStep";
export function CastingRoleEditor({ roleId, onClose }: { roleId?: string; onClose: () => void }) {
  const { projectId, project, castingWorkflow } = useProjectWorkspace();
  const router = useRouter();
  const { showToast } = useToast();
  const casting = castingWorkflow?.primaryCasting;
  const form = buildWorkspaceCastingForm(projectId, project, casting ?? null, castingWorkflow?.roles ?? []);
  return <CastingRoleStep form={form} editorOnly initialRoleId={roleId} onDismiss={onClose} onFormChange={() => {}} onCommit={async (next) => {
    try {
      const result = !casting && (castingWorkflow?.roles.length ?? 0) > 0
        ? await saveProjectRoleDetails(projectId, roleId ?? null, next)
        : await (casting ? saveProjectCastingChanges : saveProjectCastingDraft)(projectId, next);
      if (!result.ok) { showToast({ message: result.error, variant: "error" }); return false; }
      router.refresh(); return true;
    } catch { showToast({ message: "Could not save this role. Your changes are still here.", variant: "error" }); return false; }
  }} />;
}
