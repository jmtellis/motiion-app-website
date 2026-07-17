"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";

export function navigateAuthSplitBack(router: AppRouterInstance) {
  if (typeof window === "undefined") return;

  const referrer = document.referrer;
  const hasSameOriginReferrer =
    referrer.length > 0 && new URL(referrer).origin === window.location.origin;

  if (hasSameOriginReferrer || window.history.length > 1) {
    router.back();
    return;
  }

  router.push("/");
}

export function SignupSplitReturnButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="signup-split-cover__return-link"
      onClick={() => navigateAuthSplitBack(router)}
    >
      Back
    </button>
  );
}
