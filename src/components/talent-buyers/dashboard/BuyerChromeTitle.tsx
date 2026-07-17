"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import {
  defaultBuyerChromeBreadcrumbs,
  defaultBuyerChromeTitle,
} from "@/lib/talent-buyers/buyer-chrome-defaults";

import { BuyerBreadcrumbs } from "./BuyerBreadcrumbs";
import { useBuyerPageChromeContext } from "./BuyerPageChromeContext";

export function BuyerChromeTitle() {
  const pathname = usePathname();
  const { chrome } = useBuyerPageChromeContext();

  const breadcrumbs = useMemo(() => {
    return chrome.breadcrumbs ?? defaultBuyerChromeBreadcrumbs(pathname) ?? [
      { label: defaultBuyerChromeTitle(pathname) },
    ];
  }, [chrome.breadcrumbs, pathname]);

  return <BuyerBreadcrumbs items={breadcrumbs} />;
}
