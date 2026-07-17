const ARROW_FOCUS_CONTAINER_SELECTOR = [
  '[role="listbox"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="tablist"]',
  '[role="radiogroup"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="tree"]',
  '[data-preserve-arrow-focus]',
].join(", ");

const NON_TYPING_INPUT_TYPES = new Set([
  "button",
  "submit",
  "reset",
  "image",
  "checkbox",
  "radio",
  "file",
  "hidden",
]);

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  if (target.tagName === "INPUT") {
    const type = (target as HTMLInputElement).type.toLowerCase() || "text";
    return !NON_TYPING_INPUT_TYPES.has(type);
  }
  return false;
}

export function preservesArrowFocus(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(ARROW_FOCUS_CONTAINER_SELECTOR));
}

/** Clear focus left on buttons/links after arrow-key navigation moves selection elsewhere. */
export function releaseStuckFocusFromArrowNavigation(): void {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  if (isTypingTarget(active)) return;
  if (preservesArrowFocus(active)) return;
  active.blur();
}

export function isArrowNavigationKey(key: string): boolean {
  return key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight";
}
