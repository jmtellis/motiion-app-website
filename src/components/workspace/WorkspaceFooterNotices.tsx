"use client";

import { useRouter } from "next/navigation";

export function WorkspaceFooterNotices({
  testEnvironment,
  upgrade,
}: {
  testEnvironment: boolean;
  upgrade?: {
    title: string;
    detail: string;
    actionLabel: string;
    href?: string;
    pending?: boolean;
    onAction?: () => void;
  } | null;
}) {
  const router = useRouter();
  if (!testEnvironment && !upgrade) return null;

  function openUpgrade() {
    if (!upgrade || upgrade.pending) return;
    if (upgrade.onAction) {
      upgrade.onAction();
      return;
    }
    if (upgrade.href) router.push(upgrade.href);
  }

  return (
    <div className="workspace-footer-notices">
      {testEnvironment ? (
        <p className="workspace-test-banner">TEST ENVIRONMENT · Test accounts and content only</p>
      ) : null}
      {upgrade ? (
        <button
          type="button"
          className="workspace-upgrade-banner"
          disabled={upgrade.pending}
          onClick={openUpgrade}
        >
          <span>
            <strong>{upgrade.title}</strong>
            <small>{upgrade.detail}</small>
          </span>
          <span className="workspace-upgrade-banner__action">
            {upgrade.pending ? "Working…" : upgrade.actionLabel}
          </span>
        </button>
      ) : null}
    </div>
  );
}
