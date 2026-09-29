"use client";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => unknown;
};

const TRANSITION_TIMEOUT_MS = 1200;

let pendingResolve: (() => void) | null = null;

/** Called by the persistent workspace shell once the next route has committed. */
export function resolvePendingViewTransition() {
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve?.();
}

/**
 * Push with a shared-element View Transition when the browser supports it.
 * Falls back to a plain push for reduced motion or unsupported browsers.
 */
export function navigateWithViewTransition(
  push: (href: string) => void,
  href: string,
  options: { reducedMotion?: boolean | null } = {},
) {
  const doc = typeof document === "undefined" ? null : (document as ViewTransitionDocument);
  if (!doc || options.reducedMotion || typeof doc.startViewTransition !== "function") {
    push(href);
    return;
  }

  resolvePendingViewTransition();
  doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        pendingResolve = resolve;
        push(href);
        window.setTimeout(resolvePendingViewTransition, TRANSITION_TIMEOUT_MS);
      }),
  );
}

export function rosterStackTransitionName(projectId: string) {
  return `roster-stack-${projectId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}
