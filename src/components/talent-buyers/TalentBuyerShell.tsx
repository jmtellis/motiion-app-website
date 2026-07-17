"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { BuyerChromeBar, BuyerChromeLogo } from "@/components/talent-buyers/dashboard/BuyerChromeBar";

import { TalentChromeProvider, useTalentChromeContext } from "./TalentChromeContext";

function TalentBuyerShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { slots, profileBackRef } = useTalentChromeContext();
  const isProfileRoute = pathname.startsWith("/talent/") && pathname !== "/talent";
  const isNavigatorRoute = pathname === "/talent";

  const start =
    slots.start ??
    (isProfileRoute ? (
      <button
        type="button"
        className="talent-buyer-shell__back"
        onClick={() => {
          const handler = profileBackRef.current;
          if (handler) {
            handler();
            return;
          }
          router.push("/talent");
        }}
      >
        <ChevronLeft className="size-3.5" aria-hidden />
        Back to Search
      </button>
    ) : null);

  return (
    <div className="talent-buyer-shell">
      {!isNavigatorRoute ? (
        <BuyerChromeBar
          className="talent-buyer-shell__chrome"
          start={start}
          center={slots.center !== undefined ? slots.center : <BuyerChromeLogo />}
          end={slots.end ?? undefined}
        />
      ) : null}
      <div className="talent-buyer-shell__stage">{children}</div>
    </div>
  );
}

export function TalentBuyerShell({ children }: { children: ReactNode }) {
  return (
    <TalentChromeProvider>
      <TalentBuyerShellFrame>{children}</TalentBuyerShellFrame>
    </TalentChromeProvider>
  );
}
