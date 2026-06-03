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
      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => setModal("ios")}
          className={cn(
            "btn-primary btn-hero inline-flex w-full items-center justify-center gap-2 text-sm sm:w-auto sm:min-w-[10rem]",
            dark && "btn-on-dark",
          )}
        >
          <AppleLogo className="h-[1.125rem] w-[1.125rem] shrink-0" />
          {iosHeroCta.label}
        </button>

        <button
          type="button"
          onClick={() => setModal("learn")}
          className={cn(
            "btn-outline btn-hero w-full text-sm sm:w-auto sm:min-w-[10rem]",
            dark && "btn-outline-on-dark",
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
                  className="group flex w-full flex-col rounded-xl border border-[var(--line)] bg-white px-4 py-3.5 text-left transition hover:border-[var(--ink)] hover:shadow-[0_8px_24px_rgba(17,17,17,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <span className="text-sm font-semibold text-[var(--ink)]">{path.label}</span>
                  <span className="mt-1 text-sm leading-snug text-[var(--ink-soft)]">
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
