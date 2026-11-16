export const projectContextQuestions = [
  { key: "concurrent_projects", label: "Projects at once", question: "How many projects do you typically run at once?", help: "Count projects you work on with dancers at the same time.", options: [["1", "1"], ["2_3", "2–3"], ["4_5", "4–5"], ["6_plus", "6+"], ["not_sure", "Not sure"]] },
  { key: "project_frequency", label: "Project frequency", question: "How often do you work on projects with dancers?", help: "Choose the rhythm that best describes your work.", options: [["one_off", "One-off"], ["occasional", "Occasionally"], ["ongoing", "Ongoing"], ["not_sure", "Not sure"]] },
  { key: "management_team_size", label: "Project management team", question: "Including you, how many people manage each project (not the cast)?", help: "Include your collaborators and assistants, but not the cast.", options: [["1", "Just me"], ["2_3", "2–3"], ["4_10", "4–10"], ["11_plus", "11+"], ["not_sure", "Not sure"]] },
] as const;
export type ProjectContextKey = typeof projectContextQuestions[number]["key"];
export type ProjectContext = Partial<Record<ProjectContextKey, string | null>>;
export function projectContextLabel(key: ProjectContextKey, value: unknown) {
  return projectContextQuestions.find(question => question.key === key)?.options.find(option => option[0] === value)?.[1] ?? "Not provided";
}
export function validateProjectContext(value: ProjectContext, required = false): string | null {
  for (const question of projectContextQuestions) {
    const answer = value[question.key];
    if (required && (answer == null || answer === "")) return `Choose an answer for ${question.label.toLowerCase()}.`;
    if (answer != null && answer !== "" && !question.options.some(option => option[0] === answer)) return `Choose a valid answer for ${question.label.toLowerCase()}.`;
  }
  return null;
}
