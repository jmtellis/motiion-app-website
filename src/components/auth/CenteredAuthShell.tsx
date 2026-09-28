"use client";
import { AuthLogo } from "./AuthLogo";
import type { ReactNode } from "react";
import { AuthSplitTransitionProvider, AuthSplitLink } from "./AuthSplitTransition";
import { MarketingBodySurface } from "@/components/landing/MarketingBodySurface";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import "@/components/landing/home-split-landing.css";
import { HomeMarketingHeaderClient } from "@/components/landing/HomeMarketingHeaderClient";
import "./centered-auth.css";

export function CenteredAuthShell({ mode, children }: { mode: "login" | "signup"; children: ReactNode }) {
  const signup = mode === "signup";
  return <SmoothScroll>
    <MarketingBodySurface dark />
    <HomeMarketingHeaderClient accountUser={null} darkTheme overlayHero />
    <AuthSplitTransitionProvider>
    <div className="centered-auth">
      <main className="signup-split-panel centered-auth__main">
        <div className="signup-split-form">
          <AuthLogo className="mb-6" />
          <div className="signup-split-form__header">
            <h1 className="signup-split-form__title">{signup ? "Sign up for Motiion" : "Welcome back"}</h1>
            <p className="signup-split-form__subtitle centered-auth__subtitle">
              {signup ? "Your next move starts here." : "Sign in to your Motiion account."}{" "}
              <span>{signup ? "Already have an account?" : "Need to create an account?"}{" "}
                <AuthSplitLink href={signup ? "/login" : "/signup"} className="signup-split-text-btn signup-split-text-btn--accent">{signup ? "Log in" : "Sign up"}</AuthSplitLink>
              </span>
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  </AuthSplitTransitionProvider>
  </SmoothScroll>;
}
