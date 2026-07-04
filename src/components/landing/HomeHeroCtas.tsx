"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";

import { AppleLogo } from "@/components/icons/AppleLogo";
import { useBetaSignupModal } from "@/components/landing/BetaSignupModalProvider";
import { MarketingDialog } from "@/components/landing/MarketingDialog";
import { iosHeroCta, learnMoreHeroCta } from "@/lib/marketing/homepage-content";

type HeroModal = "ios" | "learn" | null;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function HomeHeroCtas({ dark = false }: { dark?: boolean }) {
  const [modal, setModal] = useState<HeroModal>(null);
  const { openBetaSignup } = useBetaSignupModal();
  const iosTitleId = useId();
  const iosDescriptionId = useId();
  const learnTitleId = useId();
  const learnDescriptionId = useId();
  const close = useCallback(() => setModal(null), []);

  return (
    <>
      <div className="flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => setModal("ios")}
          className="btn-hero-pill btn-hero-pill-accent w-full sm:w-auto sm:min-w-[11rem]"
        >
          <AppleLogo className="h-[1.125rem] w-[1.125rem] shrink-0" />
          {iosHeroCta.label}
        </button>

        <button
          type="button"
          onClick={() => setModal("learn")}
          className={cn(
            "btn-hero-pill w-full sm:w-auto sm:min-w-[11rem]",
            dark ? "btn-hero-pill-ghost" : "btn-outline",
          )}
        >
          {learnMoreHeroCta.label}
        </button>
      </div>

      {modal === "ios" ? (
        <MarketingDialog
          onClose={close}
          title={iosHeroCta.modal.title}
          description={iosHeroCta.modal.description}
          titleId={iosTitleId}
          descriptionId={iosDescriptionId}
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

      {modal === "learn" ? (
        <MarketingDialog
          onClose={close}
          title={learnMoreHeroCta.modal.title}
          description={learnMoreHeroCta.modal.description}
          titleId={learnTitleId}
          descriptionId={learnDescriptionId}
        >
          <ul className="flex flex-col gap-2" role="list">
            {learnMoreHeroCta.modal.paths.map((path) => (
              <li key={path.id}>
                <Link
                  href={path.href}
                  onClick={close}
                  className="group flex w-full flex-col rounded-[14px] border border-[#262626] bg-[#1e1e1e] px-4 py-3.5 text-left transition-colors hover:border-[#3a3a3a] hover:bg-[#2a2a2a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <span className="text-sm font-semibold text-[#fafafa]">{path.label}</span>
                  <span className="mt-1 text-sm leading-snug text-[#a3a3a3]">
                    {path.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </MarketingDialog>
      ) : null}
    </>
  );
}
