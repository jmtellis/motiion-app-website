export function setupChoiceCard(selected: boolean) {
  return selected
    ? "signup-split-choice signup-split-choice--selected"
    : "signup-split-choice";
}

/** Multi-select cards: rounded square with checkbox affordance. */
export function setupMultiChoiceCard(selected: boolean) {
  return selected
    ? "signup-split-choice signup-split-choice--multi signup-split-choice--selected"
    : "signup-split-choice signup-split-choice--multi";
}

export function setupPill(selected: boolean) {
  return selected ? "signup-split-pill signup-split-pill--selected" : "signup-split-pill";
}
