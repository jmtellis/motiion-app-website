"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useRegisterProfileBackHandler } from "@/components/talent-buyers/TalentChromeContext";
import type { PublicTalentProfile } from "@/types/public";

import { BuyerTalentProfileView } from "./BuyerTalentProfileView";

const SLIDE_MS = 420;

type SlidePhase = "enter" | "idle" | "exit";

type BuyerTalentProfileTransitionProps = {
  profile: PublicTalentProfile;
};

export function BuyerTalentProfileTransition({ profile }: BuyerTalentProfileTransitionProps) {
  const router = useRouter();
  const isExitingRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<SlidePhase>("enter");

  useEffect(() => {
    router.prefetch("/talent");
  }, [router]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("idle"));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const navigateBack = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    setPhase("exit");
    exitTimerRef.current = window.setTimeout(() => router.push("/talent"), SLIDE_MS);
  }, [router]);

  useRegisterProfileBackHandler(navigateBack);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={`buyer-talent-profile-route buyer-talent-profile-route--${phase}`}>
      <BuyerTalentProfileView profile={profile} />
    </div>
  );
}
