import type { SignupSplitStep } from "@/components/auth/SignupSplitShell";
import { roleOptions } from "@/lib/talent-buyers/onboarding";

export type SetupFlowAudience = "talent" | "industry";

export type SetupFlowPhase = "signup" | "onboarding" | "finishing" | "complete";

type SetupFlowAudienceConfig = {
  audienceLabel: string;
  headlines: Record<SetupFlowPhase, string>;
  subtexts: Record<SetupFlowPhase, string>;
  macroStepLabels: [string, string, string];
};

export const setupFlowConfig: Record<SetupFlowAudience, SetupFlowAudienceConfig> = {
  talent: {
    audienceLabel: "Talent",
    headlines: {
      signup: "Create your talent profile",
      onboarding: "Build your talent profile",
      finishing: "Finish your profile",
      complete: "You're ready to go",
    },
    subtexts: {
      signup:
        "For dancers and choreographers. Build a living profile, get discovered by industry teams, and book work on Motiion.",
      onboarding:
        "Add the details that help casting teams and choreographers find you and book you for work.",
      finishing: "Review everything, then start getting discovered on Motiion.",
      complete: "Your talent profile is live. Get discovered and book work.",
    },
    macroStepLabels: [
      "Create your account",
      "Build your talent profile",
      "Get discovered and book work",
    ],
  },
  industry: {
    audienceLabel: "Industry Professional",
    headlines: {
      signup: "Build your hiring workspace",
      onboarding: "Set up your workspace",
      finishing: "Finish your workspace",
      complete: "Start discovering talent",
    },
    subtexts: {
      signup: "Discover talent, manage rosters, and run projects in one place.",
      onboarding: "A few details so we can tailor your workspace.",
      finishing: "Connect your setup, then start hiring.",
      complete: "Your workspace is ready.",
    },
    macroStepLabels: [
      "Create your account",
      "Set up your workspace",
      "Discover talent and run projects",
    ],
  },
};

/** Per-step left-panel copy for industry onboarding (overrides phase defaults). */
export const industryOnboardingCoverCopy: Record<
  string,
  { headline: string; subtext: string }
> = {
  professionalContext: {
    headline: "Who are you hiring as?",
    subtext: "We’ll tailor your workspace to your role.",
  },
  goalsAndWork: {
    headline: "What do you need?",
    subtext: "Pick the jobs Motiion should help with.",
  },
  organizationAndMarket: {
    headline: "How do you work?",
    subtext: "Add your org and primary market.",
  },
  success: {
    headline: "Start discovering talent",
    subtext: "Your workspace is ready.",
  },
};

export const signupSplitMarquees = {
  talent: {
    segments: ["Choreographers", "Dancers"],
    direction: "right" as const,
  },
  industry: {
    segments: roleOptions.map((option) => option.label),
    direction: "left" as const,
  },
} satisfies Record<
  SetupFlowAudience,
  { segments: readonly string[]; direction: "left" | "right" }
>;

export const loginSplitMarquee = {
  segments: [
    ...signupSplitMarquees.talent.segments,
    ...signupSplitMarquees.industry.segments,
  ],
  direction: "left" as const,
};

export function resolveSetupFlowPhase({
  surface,
  microStep,
  isSuccess = false,
}: {
  surface: "signup" | "onboarding";
  microStep?: string;
  isSuccess?: boolean;
}): SetupFlowPhase {
  if (surface === "signup") return "signup";
  if (isSuccess) return "complete";

  if (
    microStep === "review" ||
    microStep === "notifications" ||
    microStep === "verification" ||
    microStep === "organizationAndMarket" ||
    microStep === "success"
  ) {
    return microStep === "success" ? "complete" : "finishing";
  }

  return "onboarding";
}

export function buildMacroSteps(
  audience: SetupFlowAudience,
  phase: SetupFlowPhase,
): SignupSplitStep[] {
  const { macroStepLabels } = setupFlowConfig[audience];
  const statuses: SignupSplitStep["status"][] =
    phase === "signup"
      ? ["active", "pending", "pending"]
      : phase === "onboarding"
        ? ["completed", "active", "pending"]
        : phase === "finishing"
          ? ["completed", "completed", "active"]
          : ["completed", "completed", "completed"];

  return macroStepLabels.map((label, index) => ({
    number: index + 1,
    label,
    status: statuses[index],
  }));
}

export function getSetupFlowShellProps({
  audience,
  surface,
  microStep,
  isSuccess = false,
}: {
  audience: SetupFlowAudience;
  surface: "signup" | "onboarding";
  microStep?: string;
  isSuccess?: boolean;
}) {
  const config = setupFlowConfig[audience];
  const phase = resolveSetupFlowPhase({ surface, microStep, isSuccess });
  const industryCover =
    audience === "industry" && surface === "onboarding" && microStep
      ? industryOnboardingCoverCopy[microStep]
      : undefined;

  return {
    headline: industryCover?.headline ?? config.headlines[phase],
    subtext: industryCover?.subtext ?? config.subtexts[phase],
    steps: buildMacroSteps(audience, phase),
    showSteps: false,
    showNav: surface === "signup",
    showWordmark: surface === "signup",
    mediaCover: surface === "signup",
    marquee: surface === "signup" ? signupSplitMarquees[audience] : undefined,
  };
}

export function getLoginShellProps() {
  return {
    headline: "Welcome back",
    subtext:
      "Sign in to your talent profile or industry workspace to pick up where you left off.",
    steps: [] as SignupSplitStep[],
    showSteps: false,
    showNav: true,
    mediaCover: true,
    marquee: loginSplitMarquee,
  };
}
