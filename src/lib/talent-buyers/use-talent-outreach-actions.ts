"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import {
  askTalentAvailability,
  contactTalentUser,
  requestTalentSizeSheet,
} from "@/app/(buyer-app)/(paid)/talent/actions";

type UseTalentOutreachActionsOptions = {
  talentUserId: string | undefined;
  displayName: string;
  projectId?: string;
  projectTitle?: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export function useTalentOutreachActions({
  talentUserId,
  displayName,
  projectId,
  projectTitle = "",
  onSuccess,
  onError,
}: UseTalentOutreachActionsOptions) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [sizeSheetModalOpen, setSizeSheetModalOpen] = useState(false);
  const [availabilityTitle, setAvailabilityTitle] = useState("Availability check");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [availabilityProject, setAvailabilityProject] = useState(projectTitle);
  const [sizeSheetMessage, setSizeSheetMessage] = useState("");

  const canReachTalent = Boolean(talentUserId);

  const runAction = useCallback(
    (action: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          onSuccess?.(success);
        } else {
          onError?.(result.error ?? "Something went wrong.");
        }
      });
    },
    [onError, onSuccess],
  );

  const handleMessage = useCallback(() => {
    if (!talentUserId) return;

    startTransition(async () => {
      const result = await contactTalentUser(
        talentUserId,
        projectId
          ? { contextType: "project", contextId: projectId, projectTitle }
          : undefined,
      );
      if (result.ok && result.conversationId) {
        router.push(`/messages?conversation=${result.conversationId}`);
        return;
      }
      if (result.ok && result.pendingRequest) {
        onSuccess?.(`Message request sent to ${displayName}`);
        return;
      }
      onError?.(result.error ?? "Could not start a conversation.");
    });
  }, [displayName, onError, onSuccess, projectId, projectTitle, router, talentUserId]);

  const openAvailabilityModal = useCallback(() => {
    setAvailabilityProject(projectTitle);
    setAvailabilityModalOpen(true);
  }, [projectTitle]);

  const openSizeSheetModal = useCallback(() => {
    setSizeSheetModalOpen(true);
  }, []);

  const handleAvailabilitySubmit = useCallback(() => {
    if (!talentUserId) return;

    runAction(
      () =>
        askTalentAvailability({
          talentUserId,
          title: availabilityTitle,
          message: availabilityMessage,
          projectName: availabilityProject,
          projectId,
        }),
      `Availability request sent to ${displayName}`,
    );
    setAvailabilityModalOpen(false);
  }, [
    availabilityMessage,
    availabilityProject,
    availabilityTitle,
    displayName,
    projectId,
    runAction,
    talentUserId,
  ]);

  const handleSizeSheetSubmit = useCallback(() => {
    if (!talentUserId) return;

    runAction(
      () => requestTalentSizeSheet({ talentUserId, message: sizeSheetMessage, projectId }),
      `Size sheet request sent to ${displayName}`,
    );
    setSizeSheetModalOpen(false);
  }, [displayName, projectId, runAction, sizeSheetMessage, talentUserId]);

  return {
    canReachTalent,
    isPending,
    availabilityModalOpen,
    setAvailabilityModalOpen,
    sizeSheetModalOpen,
    setSizeSheetModalOpen,
    availabilityTitle,
    setAvailabilityTitle,
    availabilityMessage,
    setAvailabilityMessage,
    availabilityProject,
    setAvailabilityProject,
    sizeSheetMessage,
    setSizeSheetMessage,
    handleMessage,
    openAvailabilityModal,
    openSizeSheetModal,
    handleAvailabilitySubmit,
    handleSizeSheetSubmit,
  };
}
