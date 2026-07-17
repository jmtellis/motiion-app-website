"use client";

import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";

export function ProjectEditChrome({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  useRegisterBuyerChrome({
    breadcrumbs: [
      { label: "Projects", href: "/projects" },
      { label: projectTitle, href: `/projects/${projectId}` },
      { label: "Edit project" },
    ],
  });
  return null;
}
