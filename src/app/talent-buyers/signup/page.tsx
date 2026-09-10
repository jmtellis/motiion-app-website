import { redirect } from "next/navigation";

/**
 * Industry signup is unified with talent/community at `/signup`.
 * After account creation, onboarding asks “What brings you to Motiion?”
 * and routes industry into `/talent-buyers/onboarding`.
 */
export default function TalentBuyerSignupPage() {
  redirect("/signup");
}
