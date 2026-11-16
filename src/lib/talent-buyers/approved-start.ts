import { isProjectPlan, type ProjectPlan } from "../billing/project-catalog";

export function recommendIndustryPlan(concurrentProjects?: string | null, projectFrequency?: string | null): { plan: ProjectPlan; reason: string } {
  if (["2_3", "4_5", "6_plus"].includes(concurrentProjects ?? "")) {
    return { plan: "production_house", reason: concurrentProjects === "6_plus"
      ? "You run several projects at once. This covers five; additional projects need Project Passes."
      : "Based on the number of projects you run at once." };
  }
  if (projectFrequency === "ongoing") return { plan: "studio", reason: "Based on your ongoing project work." };
  return { plan: "project_pass", reason: "Start with one project, without a monthly subscription." };
}

/** Only known in-app destinations may be chosen during approved setup. */
export function approvedSetupDestination(intent?: string): string | null {
  if (intent === undefined) return "/dashboard";
  if (intent === "explore") return "/talent";
  return isProjectPlan(intent) ? `/checkout?plan=${intent}` : null;
}
