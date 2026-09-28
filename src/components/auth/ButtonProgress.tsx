import type { ReactNode } from "react";

/** Keep the button's dimensions and accessible label while centering its progress indicator. */
export function ButtonProgress({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <span className="relative inline-flex w-full items-center justify-center">
      <span className={`inline-flex items-center justify-center gap-2${loading ? " invisible" : ""}`}>
        {children}
      </span>
      {loading ? (
        <span role="status" className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="size-5 motion-safe:animate-spin" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" opacity=".24" />
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="41 57" />
          </svg>
          <span className="sr-only">Loading</span>
        </span>
      ) : null}
    </span>
  );
}
