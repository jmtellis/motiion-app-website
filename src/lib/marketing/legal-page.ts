import type { Viewport } from "next";

import { MARKETING_DARK } from "@/lib/marketing/dark-theme";

export type LegalPageSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const legalMarketingViewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
  viewportFit: "cover",
};
