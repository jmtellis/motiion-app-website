import type { Viewport } from "next";

import { AuthSplitDarkSurface } from "@/components/auth/AuthSplitDarkSurface";
import { MARKETING_DARK } from "@/lib/marketing/dark-theme";

export const viewport: Viewport = {
  themeColor: MARKETING_DARK.bg,
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthSplitDarkSurface />
      {children}
    </>
  );
}
