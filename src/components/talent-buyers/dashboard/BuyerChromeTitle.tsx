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
    if (chrome.breadcrumbs) return chrome.breadcrumbs;
    return defaultBuyerChromeBreadcrumbs(pathname) ?? [
      { label: defaultBuyerChromeTitle(pathname) },
    ];
  }, [chrome.breadcrumbs, pathname]);

  const hasTitleStack = Boolean(chrome.title || chrome.lede);

  if (chrome.leading && hasTitleStack) {
    return (
      <div className="buyer-chrome-bar__title-block buyer-chrome-bar__title-block--stacked">
        {chrome.leading}
        <div className="buyer-chrome-bar__title-text">
          {chrome.title ? (
            <p className="buyer-chrome-bar__project-title">{chrome.title}</p>
          ) : null}
          {chrome.lede ? (
            <p className="buyer-chrome-bar__project-lede">{chrome.lede}</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!chrome.leading) {
    return <BuyerBreadcrumbs items={breadcrumbs} />;
  }

  return (
    <div className="buyer-chrome-bar__title-block">
      {chrome.leading}
      {breadcrumbs.length > 0 ? <BuyerBreadcrumbs items={breadcrumbs} /> : null}
    </div>
  );
}
