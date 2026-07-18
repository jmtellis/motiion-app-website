"use client";

import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";

export function CastingCreateChrome({
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
      { label: "Castings", href: `/projects/${projectId}/castings` },
      { label: "Add casting" },
    ],
  });

  return null;
}
