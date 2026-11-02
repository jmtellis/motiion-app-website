"use client";

import Link from "next/link";
import { Modal } from "@/components/talent-buyers/dashboard/Modal";
import { safeAuthReturnPath } from "@/lib/auth/redirects";

export function SessionSignUpRequiredModal({ sharePath, onClose }: { sharePath: string; onClose: () => void }) {
  const next = encodeURIComponent(safeAuthReturnPath(sharePath) ?? "/home");
  return <Modal open onClose={onClose} title="Join with your Motiion account" description="Sign in or create a free talent account, then return here to request a place.">
    <div className="flex flex-wrap gap-3"><Link className="ui-button" href={`/login?next=${next}`}>Sign in</Link><Link className="ui-button ui-button--secondary" href={`/signup?account_type=talent&next=${next}`}>Create account</Link></div>
  </Modal>;
}
