"use client";

import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";

export function CastingEditChrome({
  projectId,
  projectTitle,
  castingTitle,
}: {
  projectId: string;
  projectTitle: string;
  castingTitle: string;
}) {
  useRegisterBuyerChrome({
    breadcrumbs: [
      { label: "Projects", href: `/projects` },
      { label: projectTitle, href: `/projects/${projectId}/overview` },
      { label: castingTitle || "Casting", href: `/projects/${projectId}/workspace/breakdown` },
      { label: "Edit" },
    ],
  });

  return null;
}
