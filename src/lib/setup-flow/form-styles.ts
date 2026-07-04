export function setupChoiceCard(selected: boolean) {
  return selected
    ? "signup-split-choice signup-split-choice--selected"
    : "signup-split-choice";
}

export function setupPill(selected: boolean) {
  return selected ? "signup-split-pill signup-split-pill--selected" : "signup-split-pill";
}
