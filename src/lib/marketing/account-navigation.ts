export type MarketingAccountAction = {
  label: "Log in" | "Account" | "Dashboard";
  href: string;
  completeSetup?: boolean;
};

export function marketingAccountAction(state: {
  signedIn: boolean;
  industry: boolean;
  approved: boolean;
  setupComplete: boolean;
  destination: string;
}): MarketingAccountAction {
  if (!state.signedIn) return { label: "Log in", href: "/login" };
  if (state.industry) {
    if (!state.approved) return { label: "Account", href: "/talent-buyers/application" };
    return { label: "Dashboard", href: "/dashboard", completeSetup: !state.setupComplete };
  }
  return { label: state.setupComplete ? "Dashboard" : "Account", href: state.destination };
}
