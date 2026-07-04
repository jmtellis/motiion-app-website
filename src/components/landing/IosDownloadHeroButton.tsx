"use client";

import { useCallback, useId, useState } from "react";

import { AppleLogo } from "@/components/icons/AppleLogo";
import { useBetaSignupModal } from "@/components/landing/BetaSignupModalProvider";
import { MarketingDialog } from "@/components/landing/MarketingDialog";
import { iosHeroCta } from "@/lib/marketing/homepage-content";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function IosDownloadHeroButton({
  dark = false,
  className,
}: {
  dark?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { openBetaSignup } = useBetaSignupModal();
  const titleId = useId();
  const descriptionId = useId();
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("btn-hero-pill btn-hero-pill-accent w-full sm:w-auto sm:min-w-[11rem]", className)}
      >
        <AppleLogo className="h-[1.125rem] w-[1.125rem] shrink-0" />
        {iosHeroCta.label}
      </button>

      {open ? (
        <MarketingDialog
          onClose={close}
          title={iosHeroCta.modal.title}
          description={iosHeroCta.modal.description}
          titleId={titleId}
          descriptionId={descriptionId}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                close();
                openBetaSignup();
              }}
              className="btn-primary w-full sm:flex-1"
            >
              {iosHeroCta.modal.betaCta.label}
            </button>
            <button type="button" onClick={close} className="btn-outline w-full sm:flex-1">
              {iosHeroCta.modal.dismissLabel}
            </button>
          </div>
        </MarketingDialog>
      ) : null}
    </>
  );
}
