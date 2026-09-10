"use client";

import { useRouter } from "next/navigation";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import {
  BUYER_CREATE_INTENT_OPTIONS,
  createIntentPath,
  type BuyerCreateIntent,
} from "@/lib/talent-buyers/create-intent";

import "./project-create.css";

function choiceClass() {
  return "project-create__choice project-create__choice--picker";
}

export function ProjectTypePickerOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  function selectIntent(intent: BuyerCreateIntent) {
    onClose();
    router.push(createIntentPath(intent));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="What are you creating?"
      description="Choose a casting, event, class, or session."
      size="xl"
    >
      <div className="project-create-picker__modal-body">
        <div className="project-create-picker__page">
          <h3 className="project-create-picker__section-title">Castings & activities</h3>
          <div className="project-create__choice-grid project-create__choice-grid--2 project-create-picker__choices">
            {BUYER_CREATE_INTENT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={choiceClass()}
                onClick={() => selectIntent(option.value)}
              >
                <span className="project-create__choice-title">{option.label}</span>
                <p className="project-create__choice-copy">{option.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
