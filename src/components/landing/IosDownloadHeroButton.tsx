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
  variant = "accent",
}: {
  dark?: boolean;
  className?: string;
  /** `ghost` for outline-style CTA on dark split landing. */
  variant?: "accent" | "ghost";
}) {
  void dark;
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
        className={cn(
          "btn-hero-pill w-full sm:w-auto sm:min-w-[11rem]",
          variant === "ghost" ? "btn-hero-pill-ghost" : "btn-hero-pill-accent",
          className,
        )}
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
              className="btn-primary btn-on-dark w-full sm:flex-1"
            >
              {iosHeroCta.modal.betaCta.label}
            </button>
            <button
              type="button"
              onClick={close}
              className="btn-outline btn-outline-on-dark w-full sm:flex-1"
            >
              {iosHeroCta.modal.dismissLabel}
            </button>
          </div>
        </MarketingDialog>
      ) : null}
    </>
  );
}
