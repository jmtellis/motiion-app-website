"use client";
import Link from "next/link";
import { AuthLogo } from "./AuthLogo";
import type { ReactNode } from "react";
import { AuthSplitTransitionProvider, AuthSplitLink } from "./AuthSplitTransition";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import "@/components/landing/home-split-landing.css";
import { HomeMarketingHeaderClient } from "@/components/landing/HomeMarketingHeaderClient";
import "./centered-auth.css";

export function CenteredAuthShell({ mode, children, title, subtitle, showAlternateAuth = true, showHeading = true, showLogo = false, wide = false, footer, alternateAccount, accountCreation = false, applicationLayout = false, introNote, accountMenu }: { mode: "login" | "signup"; children: ReactNode; title?: string; subtitle?: string; showAlternateAuth?: boolean; showHeading?: boolean; showLogo?: boolean; wide?: boolean; footer?: ReactNode; alternateAccount?: { href: string; label: string }; accountCreation?: boolean; applicationLayout?: boolean; introNote?: string; accountMenu?: ReactNode }) {
  const signup = mode === "signup";
  return <SmoothScroll enabled={!applicationLayout}>
    <MarketingBodySurface dark />
    <HomeMarketingHeaderClient overlay accountMenu={accountMenu} />
    <AuthSplitTransitionProvider>
    <div className={`centered-auth${wide ? " centered-auth--wide" : ""}${applicationLayout ? " centered-auth--application" : ""}${accountCreation ? " centered-auth--account-creation" : ""}`}>
      <main className="signup-split-panel centered-auth__main">
        <div className="signup-split-form">
          {showLogo && <AuthLogo className={accountCreation ? "centered-auth__logo" : "mb-6"} />}
          {showHeading && <div className="signup-split-form__header">
            <h1 className="signup-split-form__title">{title ?? (signup ? "Sign up for Motiion" : "Welcome back")}</h1>
            {subtitle !== "" && <p className="signup-split-form__subtitle centered-auth__subtitle">
              {subtitle ?? (signup ? "Your next move starts here." : "Sign in to your Motiion account.")}{" "}
              {showAlternateAuth && !accountCreation && <span>{signup ? "Already have an account?" : "Need to create an account?"}{" "}
                <AuthSplitLink href={signup ? "/login" : "/signup"} className="signup-split-text-btn signup-split-text-btn--accent">{signup ? "Log in" : "Sign up"}</AuthSplitLink>
                {alternateAccount && <> or <Link href={alternateAccount.href} scroll={false} className="signup-split-text-btn signup-split-text-btn--accent">{alternateAccount.label}</Link></>}
              </span>}
            </p>}
            {introNote && <p className="centered-auth__intro-note">{introNote}</p>}
          </div>}
          {children}
          {accountCreation && showAlternateAuth && <div className="centered-auth__account-links">
            <p>Already have an account? <AuthSplitLink href="/login" className="signup-split-text-btn signup-split-text-btn--accent">Log in</AuthSplitLink></p>
            {alternateAccount && <p><Link href={alternateAccount.href} scroll={false} className="signup-split-text-btn signup-split-text-btn--accent">{alternateAccount.label}</Link></p>}
          </div>}
        </div>
      </main>
      {footer && <footer className="centered-auth__footer">{footer}</footer>}
    </div>
  </AuthSplitTransitionProvider>
  </SmoothScroll>;
}
