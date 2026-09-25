"use client";

import { Component, type ReactNode } from "react";

type Props = {
  label: string;
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class PreviewErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-[var(--ds-error)]/40 bg-[var(--ds-error)]/10 px-3 py-2 text-xs text-[#f97066]">
          Preview failed for {this.props.label}: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}
