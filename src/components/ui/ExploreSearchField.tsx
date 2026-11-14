import type { InputHTMLAttributes, ReactNode, Ref } from "react";

/** Shared search field for Explore lists and workspace lists. */
export function ExploreSearchField({ inputRef, children, ...props }: InputHTMLAttributes<HTMLInputElement> & { inputRef?: Ref<HTMLInputElement>; children?: ReactNode }) {
  return <label className="discover-browse__field discover-browse__field--search">
    <input {...props} ref={inputRef} className="workspace-bare-input" />
    {children}
  </label>;
}
