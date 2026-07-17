"use client";

import { useRegisterBuyerChrome } from "@/components/talent-buyers/dashboard/BuyerPageChromeContext";
import { getProjectCreateConfig } from "@/lib/talent-buyers/project-create-registry";

import { CastingProjectCreateShell } from "./CastingProjectCreateShell";

export function CastingProjectCreatePage() {
  const createConfig = getProjectCreateConfig("casting");

  useRegisterBuyerChrome({
    breadcrumbs: [
      { label: "Projects", href: "/projects" },
      { label: createConfig.breadcrumbLabel },
    ],
    title: createConfig.pageTitle,
  });

  return <CastingProjectCreateShell />;
}
