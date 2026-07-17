"use client";

import { useRouter } from "next/navigation";

import { CastingComposer } from "@/components/talent-buyers/casting/CastingComposer";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { createDefaultCastingComposerForm } from "@/lib/talent-buyers/casting-composer-defaults";

export function CreateCastingModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  function handleComplete() {
    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add casting"
      description="Configure roles and submission settings for this casting."
      size="xl"
    >
      <CastingComposer
        initialForm={{ ...createDefaultCastingComposerForm(), projectId }}
        mode="create"
        presentation="scoped"
        onComplete={handleComplete}
        onCancel={onClose}
      />
    </Modal>
  );
}
