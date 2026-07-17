"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import {
  PROJECT_TYPE_INTENTION_GROUPS,
  PROJECT_TYPE_OPTIONS,
} from "@/lib/talent-buyers/project-composer-defaults";
import type { ProjectType } from "@/lib/talent-buyers/project-types";
import { projectCreatePath } from "@/lib/talent-buyers/project-create-registry";

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
  const reducedMotion = useReducedMotion();
  const [pageIndex, setPageIndex] = useState(0);

  const groups = PROJECT_TYPE_INTENTION_GROUPS;
  const activeGroup = groups[pageIndex];
  const isFirstPage = pageIndex === 0;
  const isLastPage = pageIndex === groups.length - 1;

  function handleClose() {
    setPageIndex(0);
    onClose();
  }

  function goToPage(nextIndex: number) {
    setPageIndex(Math.max(0, Math.min(groups.length - 1, nextIndex)));
  }

  function selectType(type: ProjectType) {
    handleClose();
    router.push(projectCreatePath(type));
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="What are you creating?"
      description="Page through each category to find your project type. This cannot be changed after creation."
      size="xl"
      footer={
        <div className="project-create-picker__footer">
          <button
            type="button"
            className="project-create-picker__nav-btn"
            onClick={() => goToPage(pageIndex - 1)}
            disabled={isFirstPage}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Previous
          </button>

          <div className="project-create-picker__dots" role="tablist" aria-label="Project categories">
            {groups.map((group, index) => (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={index === pageIndex}
                aria-label={group.label}
                className={
                  index === pageIndex
                    ? "project-create-picker__dot project-create-picker__dot--active"
                    : "project-create-picker__dot"
                }
                onClick={() => goToPage(index)}
              />
            ))}
          </div>

          <button
            type="button"
            className="project-create-picker__nav-btn"
            onClick={() => goToPage(pageIndex + 1)}
            disabled={isLastPage}
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      }
    >
      <div className="project-create-picker__modal-body">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeGroup.id}
            className="project-create-picker__page"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="project-create-picker__section-eyebrow">
              {pageIndex + 1} of {groups.length}
            </p>
            <h3 className="project-create-picker__section-title">{activeGroup.label}</h3>

            <div className="project-create__choice-grid project-create__choice-grid--2 project-create-picker__choices">
              {activeGroup.types.map((type) => {
                const option = PROJECT_TYPE_OPTIONS.find((entry) => entry.value === type);
                if (!option) return null;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={choiceClass()}
                    onClick={() => selectType(option.value)}
                  >
                    <span className="project-create__choice-title">{option.label}</span>
                    <p className="project-create__choice-copy">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Modal>
  );
}
