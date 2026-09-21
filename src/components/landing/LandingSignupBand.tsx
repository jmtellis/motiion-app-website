"use client";

import { HomeSignupSection } from "@/components/landing/HomeSignupSection";
import { useLandingAudience } from "@/components/landing/LandingAudienceContext";

export function LandingSignupBand() {
  const { audience } = useLandingAudience();

  return <HomeSignupSection variant="footer-reveal" audience={audience} />;
}
