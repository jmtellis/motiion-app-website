"use client";

import { useEffect, useState, type ReactNode } from "react";
import { accountSessionChanged } from "@/lib/auth/account-session";
import { createClientSupabaseClient } from "@/lib/supabase/client";

/** Old forms must not remain usable when another tab changes the shared JWT. */
export function AccountSessionBoundary({ userId, children }: { userId: string; children: ReactNode }) {
  return <AccountSession key={userId} userId={userId}>{children}</AccountSession>;
}

function AccountSession({ userId, children }: { userId: string; children: ReactNode }) {
  const [changingAccount, setChangingAccount] = useState(false);
  useEffect(() => {
    const client = createClientSupabaseClient();
    if (!client) return;
    let navigating = false;
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (navigating || !accountSessionChanged(event, userId, session?.user.id ?? null)) return;
      navigating = true;
      setChangingAccount(true);
      // Re-run server authorization and discard the previous account's RSC,
      // component state and subscriptions. Do not do async Auth work in callback.
      window.location.reload();
    });
    return () => data.subscription.unsubscribe();
  }, [userId]);

  if (changingAccount) {
    return <main className="theme-product grid min-h-dvh place-items-center p-6" aria-busy="true"><p role="status">Refreshing your account…</p></main>;
  }
  return children;
}
